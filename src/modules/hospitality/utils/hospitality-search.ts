import type { Prisma } from "@/db/types";

/**
 * Hospitality search — prefix-only strategy (Phase 2 P2-07).
 *
 * Uses Prisma `startsWith` → MySQL `LIKE 'term%'` so btree indexes on
 * `name`, `box_display_id`, and floor `name` can satisfy the predicate.
 *
 * **Limits**
 * - Queries longer than {@link HOSPITALITY_SEARCH_QUERY_MAX} chars are truncated.
 * - Mid-string / suffix matches are not supported (e.g. searching "234" will not
 *   match box id "GP-1234" unless the id starts with "234").
 * - Room search is prefix-only on `vertical_hospitality_floor_box.room`.
 *
 * Full-text / `%term%` contains search is deferred until a dedicated FULLTEXT
 * index or search service is approved (cross-vertical schema change).
 */
export const HOSPITALITY_SEARCH_QUERY_MAX = 200;

export function normalizeHospitalitySearchQuery(query?: string): string | undefined {
	const trimmed = query?.trim();
	if (!trimmed) {
		return undefined;
	}
	return trimmed.slice(0, HOSPITALITY_SEARCH_QUERY_MAX);
}

/** Index-friendly `{ startsWith }` filter for a single string column. */
export function hospitalityPrefixStringFilter(
	query?: string,
): { startsWith: string } | undefined {
	const normalized = normalizeHospitalitySearchQuery(query);
	return normalized ? { startsWith: normalized } : undefined;
}

/** OR clause for hospitality GrubPac list/search (name, display id, assigned room). */
export function buildHospitalityBoxSearchOr(
	query?: string,
): Prisma.boxWhereInput["OR"] | undefined {
	const prefix = hospitalityPrefixStringFilter(query);
	if (!prefix) {
		return undefined;
	}

	return [
		{ name: prefix },
		{ box_display_id: prefix },
		{ hospitality_floor_boxes: { some: { room: prefix } } },
	];
}
