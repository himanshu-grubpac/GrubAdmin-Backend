import { createHandlers } from "@/utils/hono-factory.ts";
import { authGuard } from "@/middlewares/auth";
import {
	updateFaqQuestionsRequestBodyValidators,
	updateFaqQuestionsRequestParamsValidators,
} from "@/modules/admin/validators/faq.validators.ts";
import type { faq_question } from "@/db/types";
import { updateFaqQuestion } from "@/db/actions/faq.actions.ts";
import type { APIResponse } from "@/types/api";
import { APIError } from "@/types/error";
import { services } from "@/services";
import { FAQ_FOLDER_PREFIX, SUPPORT_PERMISSIONS } from "@/configs/constants.ts";
import { Permission } from "@/utils/permission.ts";
import { ipMiddleware } from "@/middlewares/common/ip.ts";

interface ResponseData {
	faq: faq_question;
}

export const patchFaqHandler = createHandlers(
	authGuard(["admin", "employee"]),
	updateFaqQuestionsRequestBodyValidators,
	updateFaqQuestionsRequestParamsValidators,
	ipMiddleware,
	async (context) => {
		const { admin, role, ip } = context.var;

		Permission.checkAdminPermissions({
			admin,
			permissions_allowed: {
				support: [SUPPORT_PERMISSIONS.edit_questions],
			},
		});

		const {
			question,
			answer,
			publishing_status,
			categories,
			file_keys_deleted,
			files,
		} = context.req.valid("form");

		const { id } = context.req.valid("param");

		const parsedCategories: string[] = categories
			? JSON.parse(categories)
			: [];

		if (!Array.isArray(parsedCategories)) {
			throw new APIError(
				"Categories must be passed in the format of an array",
				undefined,
				undefined,
				400,
			);
		}

		const uploadedFiles = Array.isArray(files) ? files : [files];

		const fileKeysDeleted: string[] = file_keys_deleted
			? JSON.parse(file_keys_deleted)
			: [];

		const fileResponses = await Promise.allSettled(
			uploadedFiles.map((file) =>
				services.s3.uploadToS3({
					acl: "public-read",
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

		const faq = await updateFaqQuestion({
			categories: parsedCategories,
			publishing_status,
			answer,
			question,
			id,
			files_added: fileKeys,
			file_keys_deleted: fileKeysDeleted,
		});

		if (!faq) {
			throw new APIError("No faq found!", undefined, undefined, 404);
		}

		services.adminLogger.log({
			module: "FAQ",
			action: "update",
			admin_id: admin?.id,
			admin_name: `${admin?.first_name} ${admin?.last_name}`,
			role_id: admin?.role_id,
			role_name: role?.name,
			ip,
			effected_id: faq.id,
			effected_name: faq.question,
		});

		return context.json<APIResponse<ResponseData>>({
			success: true,
			code: 200,
			data: {
				faq,
			},
		});
	},
);
