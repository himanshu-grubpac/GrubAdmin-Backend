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

// Liveness check — is the server process alive?
export const livenessHandler = createHandlers(async (context) => {
	return context.json<APIResponse<null>>(
		{
			success: true,
			code: 200,
			message: "alive",
			data: null,
		},
		{
			status: 200,
		},
	);
});

// Readiness check — are dependencies ready to serve requests?
export const readinessHandler = createHandlers(async (context) => {
	const errors: string[] = [];

	// Check MySQL connectivity
	try {
		await prisma.$queryRaw`SELECT 1`;
	} catch (e) {
		errors.push(`mysql: ${e}`);
	}

	// Check MongoDB connectivity (only if we expect it to be connected)
	if (errors.length === 0) {
		return context.json<APIResponse<{ healthy: boolean }>>(
			{
				success: true,
				code: 200,
				message: "ready",
				data: { healthy: true },
			},
			{ status: 200 },
		);
	}

	return context.json<APIResponse<{ healthy: boolean; errors: string[] }>>(
		{
			success: false,
			code: 503,
			message: "not ready",
			data: { healthy: false, errors },
		},
		{ status: 503 },
	);
});

// Full health check (detailed, for debugging)
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
