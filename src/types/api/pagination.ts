export interface Pagination {
	page: number;
	limit: number;
	total_count: number;
	last_page: number;
	next_page?: number | null;
	prev_page?: number | null;
	from?: number;
	to?: number;
}
