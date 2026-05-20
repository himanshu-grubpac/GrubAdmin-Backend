import { ClientAdminLog, FoodEmployeeLog, RestaurantLog, GrubpacLog } from "@/db/mongo-schema";
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
		log_id,
		filters,
	} = args;

	const filter: any = {};
	const andConditions: any[] = [];

	if (client_id) filter.client_id = client_id;
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

	if (search) {
		const tokens = search
			.trim()
			.replace(/\s+/g, " ")
			.split(" ")
			.filter(Boolean);
		if (tokens.length > 0) {
			const tokenConditions = tokens.map((token) => ({
				$or: [
					{ description: { $regex: token, $options: "i" } },
					{ type: { $regex: token, $options: "i" } },
					{ category: { $regex: token, $options: "i" } },
					{ "actor.name": { $regex: token, $options: "i" } },
					{ "actor.ip": { $regex: token, $options: "i" } },
					{ "subject.name": { $regex: token, $options: "i" } },
				],
			}));
			andConditions.push({ $and: tokenConditions });
		}
	}

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
		if (cats.includes("Employee")) Models.push(FoodEmployeeLog);
		if (cats.includes("GrubPac")) Models.push(GrubpacLog);
		if (cats.includes("GrubLock")) {
			Models.push(GrubpacLog);
			Models.push(ClientAdminLog);
		}
		if (cats.includes("Profile")) Models.push(ClientAdminLog);
		
		// Fallback if category didn't match specific models
		if (Models.length === 0) Models = [ClientAdminLog, FoodEmployeeLog, RestaurantLog, GrubpacLog];
	} else {
		Models = [ClientAdminLog, FoodEmployeeLog, RestaurantLog, GrubpacLog];
	}

	Models = [...new Set(Models)]; // unique models

	if (Models.length === 1) {
		// Single model query
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
	} else {
		// Multiple models query via aggregate $unionWith
		const limitVal = page && page_size ? page_size : undefined;
		const skipVal = page && page_size ? (page - 1) * page_size : undefined;

		const aggregatePipeline: any[] = [];
		aggregatePipeline.push({ $match: filter });

		const initialModel = Models[0];

		for (let i = 1; i < Models.length; i++) {
			aggregatePipeline.push({
				$unionWith: {
					coll: Models[i].collection.name,
					pipeline: [{ $match: filter }]
				}
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
			console.error("Aggregation error in multiple logs query:", error);
			return { logs: [], page, page_size, page_count: 0, total_count: 0 };
		}
	}
};
