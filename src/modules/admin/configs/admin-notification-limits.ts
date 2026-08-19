import { SEARCH_PAGE_SIZE } from "@/validators/pagination";

/** Max rows per admin notification list page (A-BE-02). */
export const ADMIN_NOTIFICATION_MAX_PAGE_SIZE = SEARCH_PAGE_SIZE;

/** Header dropdown preview — bounded, not a full-tenant dump. */
export const ADMIN_NOTIFICATION_MINIFIED_LIMIT = 4;

export function resolveAdminNotificationPagination(args: {
	minified?: boolean;
	page?: number;
	limit?: number;
}): { page: number; limit: number } {
	if (args.minified) {
		return { page: 1, limit: ADMIN_NOTIFICATION_MINIFIED_LIMIT };
	}

	const page = Math.max(args.page ?? 1, 1);
	const limit = Math.min(
		args.limit ?? ADMIN_NOTIFICATION_MAX_PAGE_SIZE,
		ADMIN_NOTIFICATION_MAX_PAGE_SIZE,
	);

	return { page, limit };
}
