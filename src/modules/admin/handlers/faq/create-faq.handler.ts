import { createHandlers } from "@/utils/hono-factory.ts";
import { authGuard } from "@/middlewares/auth";
import { createFaqQuestionsRequestBodyValidators } from "@/modules/admin/validators/faq.validators.ts";
import type { faq_question } from "@/db/types";
import { createFaqQuestion } from "@/db/actions/faq.actions.ts";
import type { APIResponse } from "@/types/api";
import { APIError } from "@/types/error";
import { services } from "@/services";
import { FAQ_FOLDER_PREFIX, SUPPORT_PERMISSIONS } from "@/configs/constants.ts";
import { isValid as isValidULID } from "ulid";
import { Permission } from "@/utils/permission.ts";
import { ipMiddleware } from "@/middlewares/common/ip.ts";

interface ResponseData {
	faq: faq_question;
}

export const createFaqHandler = createHandlers(
	authGuard(["admin", "employee"]),
	createFaqQuestionsRequestBodyValidators,
	ipMiddleware,
	async (context) => {
		const { admin, role, ip } = context.var;

		Permission.checkAdminPermissions({
			admin,
			permissions_allowed: {
				support: [SUPPORT_PERMISSIONS.add_new_question],
			},
		});

		const { question, categories, answer, publishing_status, files } =
			context.req.valid("form");

		const parsedCategories: string[] = categories
			? JSON.parse(categories)
			: [];

		const uploadedFiles = Array.isArray(files) ? files : [files];

		if (!Array.isArray(parsedCategories)) {
			throw new APIError(
				"Categories must be passed in the format of an array",
				undefined,
				undefined,
				400,
			);
		}

		for (const c of parsedCategories) {
			if (!isValidULID(c)) {
				throw new APIError(
					"Please make sure the ids are valid ulids",
					undefined,
					undefined,
					400,
				);
			}
		}

		const fileResponses = await Promise.allSettled(
			uploadedFiles.map((file) =>
				services.s3.uploadToS3({
					prefix: FAQ_FOLDER_PREFIX,
					file,
				}),
			),
		);

		const fileKeys: string[] = [];

		for (const fileResponse of fileResponses) {
			if (fileResponse.status === "fulfilled") {
				fileKeys.push(fileResponse.value.key);
			}
		}

		const faq = await createFaqQuestion({
			categories: parsedCategories,
			answer,
			publishing_status,
			question,
			attachments: fileKeys,
		});

		if (!faq) {
			throw new APIError("No FAQ created!", undefined, undefined, 400);
		}

		services.adminLogger.log({
			module: "FAQ",
			action: "create",
			admin_id: admin?.id,
			admin_name: `${admin?.first_name} ${admin?.last_name}`,
			role_id: admin?.role_id,
			role_name: role?.name,
			ip,
			effected_id: faq.id,
			effected_name: faq.question,
		});

		return context.json<APIResponse<ResponseData>>(
			{
				success: true,
				code: 200,
				data: {
					faq,
				},
			},
			{
				status: 200,
			},
		);
	},
);
