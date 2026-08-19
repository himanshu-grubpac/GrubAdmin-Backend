import { PAGE_SIZE } from "@/configs/constants";

/** Max rows per admin CSV export (A-BE-01). Prevents sync 10k+ row dumps at pilot scale. */
export const ADMIN_EXPORT_MAX_ROWS = 5000;

export type AdminExportPagination = {
	fetch_all: false;
	page_number: number;
	page_size: number;
};

/**
 * Map export query to bounded DB pagination.
 * `fetch_all=true` (or omitted on bulk export) → single page capped at ADMIN_EXPORT_MAX_ROWS.
 * Explicit paginated export (`fetch_all=false`) → page_size clamped to the same cap.
 */
export function resolveAdminExportPagination(args: {
	fetch_all?: boolean;
	page_number?: number;
	page_size?: number;
}): AdminExportPagination {
	const page_number = Math.max(args.page_number ?? 1, 1);

	if (args.fetch_all !== false) {
		return {
			fetch_all: false,
			page_number: 1,
			page_size: ADMIN_EXPORT_MAX_ROWS,
		};
	}

	return {
		fetch_all: false,
		page_number,
		page_size: Math.min(args.page_size ?? PAGE_SIZE, ADMIN_EXPORT_MAX_ROWS),
	};
}
