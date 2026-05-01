export const calculatePagination = (page: number, limit: number, totalCount: number) => {
	const lastPage = Math.ceil(totalCount / (limit || 1));
	const from = totalCount === 0 ? 0 : (page - 1) * limit + 1;
	const to = Math.min(page * limit, totalCount);

	return {
		page,
		limit,
		total_count: totalCount,
		last_page: lastPage,
		next_page: page < lastPage ? page + 1 : null,
		prev_page: page > 1 ? page - 1 : null,
		from,
		to,
	};
};
