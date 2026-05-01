import type { LogAction, LogModule } from "@/types/common/log.ts";
import { AdminLog } from "@/db/mongo-schema";

interface CreateAdminLogArgs {
	module: LogModule;
	action: LogAction;
	admin_name: string;
	admin_id: string;
	role_name: string | null;
	role_id: string | null;
	effected_name?: string;
	effected_id?: string;
	ip?: string;
}

export const createAdminLog = async (args: CreateAdminLogArgs) => {
	return AdminLog.create({
		module: args.module,
		action: args.action,
		admin_name: args.admin_name,
		admin_id: args.admin_id,
		role_name: args.role_name,
		role_id: args.role_id,
		ip: args.ip,
		effected_name: args.effected_name,
		effected_id: args.effected_id,
	});
};

interface GetAdminLogsArgs {
	module?: LogModule[];
	employee?: LogAction[];
	client?: LogAction[];
	roles?: LogAction[];
	support_categories?: LogAction[];
	faq?: LogAction[];
	grubpac?: LogAction[];
	query?: string;
	pageSize?: number;
	pageNumber?: number;
	fetchAll?: boolean;
	startDate?: Date;
	endDate?: Date;
}

export const getAdminLogs = async (args: GetAdminLogsArgs) => {
	const {
		endDate,
		startDate,
		faq,
		support_categories,
		client,
		grubpac,
		fetchAll,
		roles,
		query,
		module,
		pageSize,
		pageNumber,
		employee,
	} = args;

	const moduleQuery: Record<string, any> = {};

	if (faq || support_categories || client || grubpac || roles || employee) {
		moduleQuery["$or"] = [];

		if (faq) {
			moduleQuery["$or"].push({
				module: "FAQ",
				action: faq,
			});
		}

		if (support_categories) {
			moduleQuery["$or"].push({
				module: "support_categories",
				action: support_categories,
			});
		}

		if (client) {
			moduleQuery["$or"].push({
				module: "client",
				action: client,
			});
		}

		if (roles) {
			moduleQuery["$or"].push({
				module: "role",
				action: roles,
			});
		}

		if (employee) {
			moduleQuery["$or"].push({
				module: "employee",
				action: employee,
			});
		}

		if (grubpac) {
			moduleQuery["$or"].push({
				module: "grubpac",
				action: grubpac,
			});
		}

		if (query) {
			moduleQuery["$and"] = [];

			moduleQuery["$and"].push({
				$or: moduleQuery["$or"],
			});

			moduleQuery["$and"].push({
				$or: [
					{
						admin_name: {
							$regex: query,
							$options: "i",
						},
					},
					{
						admin_id: {
							$regex: query,
							$options: "i",
						},
					},
					{
						role_name: {
							$regex: query,
							$options: "i",
						},
					},
					{
						role_id: {
							$regex: query,
							$options: "i",
						},
					},
					{
						effected_name: {
							$regex: query,
							$options: "i",
						},
					},
					{
						effected_id: {
							$regex: query,
							$options: "i",
						},
					},
				],
			});

			delete moduleQuery["$or"];
		}
	} else if (module) {
		moduleQuery["module"] = module;

		if (query) {
			moduleQuery["$and"] = [
				{
					module: moduleQuery["module"],
				},
			];

			moduleQuery["$and"].push({
				$or: [
					{
						admin_name: {
							$regex: query,
							$options: "i",
						},
					},
					{
						admin_id: {
							$regex: query,
							$options: "i",
						},
					},
					{
						role_name: {
							$regex: query,
							$options: "i",
						},
					},
					{
						role_id: {
							$regex: query,
							$options: "i",
						},
					},
					{
						effected_name: {
							$regex: query,
							$options: "i",
						},
					},
					{
						effected_id: {
							$regex: query,
							$options: "i",
						},
					},
				],
			});

			delete moduleQuery["module"];
		}
	} else if (query) {
		moduleQuery["$or"] = [];

		moduleQuery["$or"].push(
			{
				admin_name: {
					$regex: query,
					$options: "i",
				},
			},
			{
				admin_id: {
					$regex: query,
					$options: "i",
				},
			},
			{
				role_name: {
					$regex: query,
					$options: "i",
				},
			},
			{
				role_id: {
					$regex: query,
					$options: "i",
				},
			},
			{
				effected_name: {
					$regex: query,
					$options: "i",
				},
			},
			{
				effected_id: {
					$regex: query,
					$options: "i",
				},
			},
		);
	}

	const filter = {
		...moduleQuery,
	};

	if (startDate && endDate) {
		filter.createdAt =
			startDate && endDate
				? {
						$gte: startDate,
						$lte: endDate,
					}
				: undefined;
	}

	const dataQuery = AdminLog.find(filter).sort({ createdAt: -1 });

	if (!fetchAll && pageSize && pageNumber) {
		dataQuery.skip((pageNumber - 1) * pageSize).limit(pageSize);
	}

	const [total, items] = await Promise.all([
		AdminLog.countDocuments(filter),
		dataQuery,
	]);

	return {
		total,
		items,
	};
};
