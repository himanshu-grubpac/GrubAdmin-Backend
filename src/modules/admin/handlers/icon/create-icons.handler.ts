import { createHandlers } from "@/utils/hono-factory.ts";
import { authGuard } from "@/middlewares/auth";
import { createIconRequestBodyValidators } from "@/modules/admin/validators/icon.validators.ts";
import type { APIResponse } from "@/types/api";
import { APIError } from "@/types/error";
import { services } from "@/services";
import { ICON_FOLDER_PREFIX } from "@/configs/constants.ts";
import { createIcons } from "@/db/actions/icon.actions.ts";
import { Permission } from "@/utils/permission.ts";
import type { icon } from "@/db/types";

const ALLOWED_MIME_TYPES = ["image/png", "image/jpeg", "image/svg+xml", "image/webp"];
const ALLOWED_EXTENSIONS = ["png", "jpg", "jpeg", "svg", "webp"];
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB Limit

interface ResponseData {
	icons: icon[];
}

/**
 * Validates file objects rigorously to prevent malicious spoofing, empty, or oversized files.
 */
function validateIconFile(file: any) {
	// 1. Verify it's actually a File object (reject text/other parameters)
	if (!(file instanceof File)) {
		throw new APIError("Invalid input: Expected a file", undefined, undefined, 400);
	}

	// 2. Reject empty files
	if (file.size === 0) {
		throw new APIError(`File "${file.name}" is empty`, undefined, undefined, 400);
	}

	// 3. Max size constraint
	if (file.size > MAX_FILE_SIZE) {
		throw new APIError(`File "${file.name}" exceeds the maximum limit of 2MB`, undefined, undefined, 400);
	}

	const mimeType = file.type.toLowerCase();
	const name = file.name.toLowerCase();
	const extension = name.split(".").pop();

	// 4. Validate MIME Type and Extensions
	if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
		throw new APIError(`File "${file.name}" has an invalid format. Allowed formats: PNG, SVG, JPG, JPEG, WEBP`, undefined, undefined, 400);
	}

	if (!extension || !ALLOWED_EXTENSIONS.includes(extension)) {
		throw new APIError(`File "${file.name}" has an invalid file extension`, undefined, undefined, 400);
	}

	// 5. Strict Extension-MIME matching (spoof protection)
	if (mimeType === "image/png" && extension !== "png") {
		throw new APIError(`Spoofing detected: extension mismatch for PNG file`, undefined, undefined, 400);
	}
	if (mimeType === "image/svg+xml" && extension !== "svg") {
		throw new APIError(`Spoofing detected: extension mismatch for SVG file`, undefined, undefined, 400);
	}
	if (mimeType === "image/webp" && extension !== "webp") {
		throw new APIError(`Spoofing detected: extension mismatch for WEBP file`, undefined, undefined, 400);
	}
	if ((mimeType === "image/jpeg" || mimeType === "image/jpg") && extension !== "jpg" && extension !== "jpeg") {
		throw new APIError(`Spoofing detected: extension mismatch for JPEG file`, undefined, undefined, 400);
	}
}

export const createIconsHandler = createHandlers(
	authGuard(["admin"]),
	createIconRequestBodyValidators,
	async (context) => {
		const { admin } = context.var;

		// Verify RBAC permissions before parsing/processing files
		Permission.checkAdminPermissions({
			admin,
			is_super_admin: true,
			permissions_allowed: {},
		});

		const { icons } = context.req.valid("form");

		// Reject missing, empty lists, or corrupted files
		if (!icons || !Array.isArray(icons) || icons.length === 0) {
			throw new APIError("No files uploaded or invalid request structure", undefined, undefined, 400);
		}

		// Perform full rigorous validations on all files in the batch
		for (const file of icons) {
			validateIconFile(file);
		}

		const uploadedKeys: string[] = [];

		try {
			// All-or-nothing uploading sequence using Promise.all
			const uploadResponses = await Promise.all(
				icons.map(async (file) => {
					const res = await services.s3.uploadToS3({
						prefix: ICON_FOLDER_PREFIX,
						file,
					});
					uploadedKeys.push(res.key);
					return res;
				}),
			);

			const data = uploadResponses.map((res) => ({
				name: res.file_name,
				key: res.key,
			}));

			// Database Transaction Commit
			const createdIcons = await createIcons({ icons: data });

			return context.json<APIResponse<ResponseData>>(
				{
					success: true,
					code: 200,
					data: {
						icons: createdIcons,
					},
				},
				{ status: 200 },
			);
		} catch (error: any) {
			console.error("Icon Creation/S3 upload flow crashed. Commencing rollback...");
			console.error("Detailed internal error info:", error);

			// 🛡️ Transaction S3 Rollback: Delete all uploaded files in this session
			if (uploadedKeys.length > 0) {
				try {
					await services.s3.deleteFromS3(uploadedKeys, ICON_FOLDER_PREFIX);
				} catch (rollbackError) {
					console.error("Critical: Rollback cleanup failed to clean orphaned objects:", rollbackError);
				}
			}

			// Format response code safely without raw system leak
			const status = error instanceof APIError ? error.code : 500;
			const message = error instanceof APIError ? error.message : "S3 upload or database transaction failed";

			throw new APIError(message, undefined, undefined, status);
		}
	},
);
export default createIconsHandler;
