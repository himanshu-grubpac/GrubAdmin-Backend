import { createHandlers } from "@/utils/hono-factory.ts";
import { authGuard } from "@/middlewares/auth";
import { createIconRequestBodyValidators } from "@/modules/admin/validators/icon.validators.ts";
import type { APIResponse } from "@/types/api";
import { APIError } from "@/types/error";
import { services } from "@/services";
import { ICON_FOLDER_PREFIX } from "@/configs/constants.ts";
import { createIcons } from "@/db/actions/icon.actions.ts";
import { Permission } from "@/utils/permission.ts";

export const createIconsHandler = createHandlers(
	authGuard(["admin"]),
	createIconRequestBodyValidators,
	async (context) => {
		const { admin } = context.var;

		Permission.checkAdminPermissions({
			admin,
			is_super_admin: true,
			permissions_allowed: {},
		});

		const { icons } = context.req.valid("form");

		for (const icon of icons) {
			if (
				icon.type !== "image/png" &&
				icon.type !== "image/svg+xml" &&
				icon.type !== "image/svg"
			) {
				throw new APIError("Invalid file formats", undefined, undefined, 400);
			}
		}

		const uploadIconResponses = await Promise.allSettled(
			icons.map((icon) =>
				services.s3.uploadToS3({
					acl: "public-read",
					prefix: ICON_FOLDER_PREFIX,
					file: icon,
				}),
			),
		);

		const data: {
			name: string;
			key: string;
		}[] = [];

		for (const response of uploadIconResponses) {
			if (response.status === "fulfilled") {
				data.push({
					name: response.value.file_name,
					key: response.value.key,
				});
			}
		}

		await createIcons({
			icons: data,
		});

		return context.json<APIResponse>(
			{
				success: true,
				code: 200,
			},
			{
				status: 200,
			},
		);
	},
);
