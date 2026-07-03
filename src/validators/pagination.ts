import { z } from "zod";
import { PAGE_SIZE } from "@/configs/constants";

export const MAX_PAGE_SIZE = 100;
export const SEARCH_PAGE_SIZE = 50;

/** All four naming variants, optional. `limit` / `page_size` capped at MAX_PAGE_SIZE. */
export const listPaginationFields = {
	page: z.coerce.number().int().min(1).optional(),
	limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).optional(),
	page_number: z.coerce.number().int().min(1).optional(),
	page_size: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).optional(),
};

/** `page` + `limit` only, optional. */
export const pageLimitFields = {
	page: z.coerce.number().int().min(1).optional(),
	limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).optional(),
};

/** Admin-style: `page_number` defaults to 1, `page_size` defaults to PAGE_SIZE. */
export const adminPaginationFields = {
	page_number: z.coerce.number().int().min(1).default(1),
	page_size: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(PAGE_SIZE),
};

/** Search endpoints: `limit` only, optional (will be defaulted by caller or transform). */
export const searchLimitField = {
	limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).optional(),
};
