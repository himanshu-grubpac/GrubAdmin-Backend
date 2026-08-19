import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { validatorErrorHandler } from "@/utils/zod.ts";
import { SEARCH_PAGE_SIZE } from "@/validators/pagination.ts";

const myGrubpacsPageSizeSchema = z.coerce
	.number()
	.int()
	.min(1)
	.max(SEARCH_PAGE_SIZE, `Page size cannot exceed ${SEARCH_PAGE_SIZE}`);

export const updateAccountRequestBodyValidator = zValidator(
    "json",
    z.object({
        email: z.string().trim().email().optional(),
        first_name: z.string().optional(),
        last_name: z.string().optional(),
        country_code: z.string().optional(),
        mobile_number: z.string().optional(),
        old_password: z
            .string()
            .min(8, "Old password must be at least 8 characters long")
            .max(20, "Old password can be at max 20 characters long")
            .optional(),
        new_password: z
            .string()
            .min(8, "New password must be at least 8 characters long")
            .max(20, "New password can be at max 20 characters long")
            .optional(),
        organization: z.string().optional(),
    }),
    (response) => {
        if (!response.success) {
            validatorErrorHandler(response.error);
        }
    },
);

export const confirmUpdateAccountRequestBodyValidator = zValidator(
    "json",
    z.object({
        otp: z.string().min(4).max(4),
    }),
    (response) => {
        if (!response.success) {
            validatorErrorHandler(response.error);
        }
    },
);

export const transferOwnershipRequestBodyValidator = zValidator(
    "json",
    z.object({
        transfer_mode: z.enum(["selected", "all"], {
            message: "Please provide a valid transfer mode (selected or all)",
        }),
        ids: z.array(z.string()).optional(),
        name: z.string().min(1, "Name is required"),
        organization_name: z.string().min(1, "Organization name is required"),
        country_code: z.string().min(1, "Country code is required"),
        phone: z.string().trim().min(1, "Phone is required"),
        email: z.string().trim().email("Invalid email"),
        country: z.string().min(1, "Country is required"),
        state: z.string().min(1, "State is required"),
    }),
    (response) => {
        if (!response.success) {
            validatorErrorHandler(response.error);
        }
    },
);

export const verifyTransferOwnershipRequestBodyValidator = zValidator(
    "json",
    z.object({
        otp_id: z.string().min(1, "OTP ID is required"),
        otp: z.string().min(1, "OTP is required"),
    }),
    (response) => {
        if (!response.success) {
            validatorErrorHandler(response.error);
        }
    },
);

export const deleteAccountRequestBodyValidator = zValidator(
    "json",
    z.object({
        password: z
            .string()
            .min(8, "Password must be at least 8 characters long")
            .max(20, "Password can be at max 20 characters long")
            .optional(),
    }),
    (response) => {
        if (!response.success) {
            validatorErrorHandler(response.error);
        }
    },
);

export const getMyGrubpacsRequestQueryValidator = zValidator(
	"query",
	z
		.object({
			power_status: z.enum(["on", "off", "unknown"]).optional(),
			query: z.string().optional(),
			page: z.coerce.number().int().min(1).optional(),
			limit: myGrubpacsPageSizeSchema.optional(),
			page_size: myGrubpacsPageSizeSchema.optional(),
		})
		.transform((data) => ({
			power_status: data.power_status,
			query: data.query,
			page: data.page ?? 1,
			limit: data.page_size ?? data.limit ?? SEARCH_PAGE_SIZE,
		})),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);

