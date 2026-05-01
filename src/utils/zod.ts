import { APIError } from "@/types/error";
import type { z, ZodError } from "zod";

export const validatorErrorHandler = (error: z.core.$ZodError) => {
	throw new APIError(error.issues[0]?.message ?? "", undefined, undefined, 400);
};
