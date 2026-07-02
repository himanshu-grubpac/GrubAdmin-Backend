import { ClientAdminLog, DeliveryEmployeeLog, RestaurantLog, GrubpacLog, DepartmentLog } from "@/db/mongo-schema";
import type { LogCategory, LogType } from "@/services/system-log.ts";

interface GetLogsArgs {
	category?: LogCategory | LogCategory[] | string;
	type?: LogType | LogType[];
	filters?: { category: LogCategory | string; types?: LogType[]; other_types?: string[] }[];
	actor_id?: string;
	subject_id?: string;
	search?: string;
	start_date?: Date;
	end_date?: Date;
	page?: number;
	page_size?: number;
	client_id?: string; // Optional for global admin
	vertical_id?: string;
	log_id?: string;
}

export const getSystemLogs = async (args: GetLogsArgs) => {
	const {
		category,
		type,
		actor_id,
		subject_id,
		search,
		start_date,
		end_date,
		page,
		page_size,
		client_id,
		vertical_id,
		log_id,
		filters,
	} = args;

	const filter: any = {};
	const andConditions: any[] = [];

	if (client_id) filter.client_id = client_id;
	if (vertical_id) filter.vertical_id = vertical_id;
	if (log_id) filter._id = log_id;
	
	if (filters && filters.length > 0) {
		const orConditions = filters.map(f => {
			const cond: any = { category: f.category };
			const allTypes = [...(f.types || []), ...(f.other_types || [])];
			if (allTypes.length > 0) {
				cond.type = { $in: allTypes };
			}
			return cond;
		});
		andConditions.push({ $or: orConditions });
	} else {
		if (category) {
			if (typeof category === "string" && (category === "list" || category === "activity")) {
				filter.category = { $regex: `${category}$`, $options: "i" };
			} else {
				filter.category = Array.isArray(category) ? { $in: category } : category;
			}
		}
		
		if (type) {
			filter.type = Array.isArray(type) ? { $in: type } : type;
		}
	}

	if (actor_id) {
		andConditions.push({
			$or: [
				{ "actor.id": actor_id },
				{ admin_id: actor_id },
			]
		});
	}
	if (subject_id) {
		andConditions.push({
			$or: [
				{ "subject.id": subject_id },
				{ effected_id: subject_id },
			]
		});
	}

	const searchTokens = search
		? search.trim().replace(/\s+/g, " ").split(" ").filter(Boolean)
		: [];
	const hasSearch = searchTokens.length > 0;

	const searchTextConditions = hasSearch
		? searchTokens.map((token) => ({
				$or: [
					{ description: { $regex: token, $options: "i" } },
					{ type: { $regex: token, $options: "i" } },
					{ category: { $regex: token, $options: "i" } },
					{ "actor.name": { $regex: token, $options: "i" } },
					{ "actor.ip": { $regex: token, $options: "i" } },
					{ "subject.name": { $regex: token, $options: "i" } },
				],
		  }))
		: [];

	if (start_date || end_date) {
		filter.createdAt = {};
		if (start_date) filter.createdAt.$gte = start_date;
		if (end_date) filter.createdAt.$lte = end_date;
	}

	if (andConditions.length > 0) {
		filter.$and = andConditions;
	}

	let Models: any[] = [];
	let cats: string[] = [];

	if (category) {
		cats = Array.isArray(category) ? category as string[] : [category as string];
	} else if (filters && filters.length > 0) {
		cats = filters.map(f => f.category as string);
	}

	if (cats.length > 0) {
		if (cats.includes("Restaurant")) Models.push(RestaurantLog);
		if (cats.includes("Employee")) Models.push(DeliveryEmployeeLog);
		if (cats.includes("GrubPac")) Models.push(GrubpacLog);
		if (cats.includes("GrubLock")) {
			Models.push(GrubpacLog);
			Models.push(ClientAdminLog);
		}
		if (cats.includes("Department")) Models.push(DepartmentLog);
	if (cats.includes("Profile")) Models.push(ClientAdminLog);
		
		// Fallback if category didn't match specific models
		if (Models.length === 0) Models = [ClientAdminLog, DeliveryEmployeeLog, RestaurantLog, GrubpacLog, DepartmentLog];
	} else {
		Models = [ClientAdminLog, DeliveryEmployeeLog, RestaurantLog, GrubpacLog, DepartmentLog];
	}

	Models = [...new Set(Models)]; // unique models

	// Aggregation is required when hasSearch is true (need $expr + $dateToString for date search)
	const useAggregation = hasSearch || Models.length > 1;

	if (!useAggregation) {
		// Single model query, no search — use faster find()
		if (searchTextConditions.length > 0) {
			filter.$and = [...(filter.$and || []), { $and: searchTextConditions }];
		}
		let logQuery = Models[0].find(filter).sort({ createdAt: -1 });

		if (page && page_size) {
			logQuery = logQuery.skip((page - 1) * page_size).limit(page_size);
		}

		const [count, logs] = await Promise.all([
			Models[0].countDocuments(filter),
			logQuery,
		]);

		return {
			logs,
			page,
			page_size,
			page_count: logs.length,
			total_count: count,
		};
	}

	// Build aggregation pipeline (used for search-with-dates and/or multiple models)
	const limitVal = page && page_size ? page_size : undefined;
	const skipVal = page && page_size ? (page - 1) * page_size : undefined;

	const initialModel = Models[0];

	const buildSearchPipeline = () => {
		const pipe: any[] = [];
		if (hasSearch) {
			pipe.push({
				$addFields: {
					_searchableDate: {
						$dateToString: {
							format: "%d-%m-%Y %H:%M:%S",
							date: "$createdAt",
						},
					},
				},
			});
		}
		pipe.push({ $match: filter });
		if (hasSearch) {
			// For each token, require match in EITHER text fields OR date field
			const combinedConditions = searchTokens.map((token) => ({
				$or: [
					{ description: { $regex: token, $options: "i" } },
					{ type: { $regex: token, $options: "i" } },
					{ category: { $regex: token, $options: "i" } },
					{ "actor.name": { $regex: token, $options: "i" } },
					{ "actor.ip": { $regex: token, $options: "i" } },
					{ "subject.name": { $regex: token, $options: "i" } },
					{
						$expr: {
							$regexMatch: {
								input: "$_searchableDate",
								regex: token,
								options: "i",
							},
						},
					},
				],
			}));
			pipe.push({ $match: { $and: combinedConditions } });
			pipe.push({ $project: { _searchableDate: 0 } });
		}
		return pipe;
	};

	const aggregatePipeline: any[] = buildSearchPipeline();

	for (let i = 1; i < Models.length; i++) {
		aggregatePipeline.push({
			$unionWith: {
				coll: Models[i].collection.name,
				pipeline: buildSearchPipeline(),
			},
		});
	}

	aggregatePipeline.push({ $sort: { createdAt: -1 } });

	// Count total
	const countPipeline = [...aggregatePipeline, { $count: "total" }];
	try {
		const countResult = await initialModel.aggregate(countPipeline);
		const count = countResult[0]?.total || 0;

		if (skipVal !== undefined && limitVal !== undefined) {
			aggregatePipeline.push({ $skip: skipVal });
			aggregatePipeline.push({ $limit: limitVal });
		}

		let logs = await initialModel.aggregate(aggregatePipeline);

		// Maps _id to id to match schema transform
		logs = logs.map((l: any) => {
			const { _id, ...rest } = l;
			return { id: _id, ...rest };
		});

		return {
			logs,
			page,
			page_size,
			page_count: logs.length,
			total_count: count,
		};
	} catch (error) {
		console.error("Aggregation error in logs query:", error);
		return { logs: [], page, page_size, page_count: 0, total_count: 0 };
	}
};
