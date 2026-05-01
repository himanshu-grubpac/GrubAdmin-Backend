import type { APIResponse } from "@/types/api/api-response";
import { createHandlers } from "@/utils/hono-factory";
import { prisma } from "@/db";
import mongoose from "mongoose";
import { NODE_ENV } from "@/configs/env";

interface HealthCheckData {
	sql?: {
		user: string;
		database: string;
		host: string;
	};
	mongodb?: {
		user: string;
		database: string;
		host: string;
	};
}

export const healthCheckHandler = createHandlers(async (context) => {
	let sqlInfo = { user: "unknown", database: "unknown", host: "unknown" };
	let mongoInfo = { user: "unknown", database: "unknown", host: "unknown" };

	try {
		const sqlRes: any[] = await prisma.$queryRaw`SELECT USER() as user, DATABASE() as db, @@hostname as host`;
		if (sqlRes.length > 0) {
			sqlInfo = {
				user: sqlRes[0].user,
				database: sqlRes[0].db,
				host: sqlRes[0].host,
			};
		}
	} catch (e) {
		console.error("SQL Health check failed", e);
	}

	try {
		if (mongoose.connection.readyState === 1) {
			mongoInfo = {
				user: mongoose.connection.user || "admin",
				database: mongoose.connection.name || "unknown",
				host: mongoose.connection.host || "unknown",
			};
		}
	} catch (e) {
		console.error("Mongo Health check failed", e);
	}

	const data: HealthCheckData = {};
	if (NODE_ENV !== "production") {
		data.sql = sqlInfo;
		data.mongodb = mongoInfo;
	}

	return context.json<APIResponse<HealthCheckData>>(
		{
			success: true,
			code: 200,
			message: "The grubpac APIs are working!",
			data,
		},
		{
			status: 200,
		},
	);
});
