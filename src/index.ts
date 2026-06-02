import server from "@/app";
import { logger } from "@/utils/logger";
import { PORT } from "@/configs/env";

// Prevent process crashes from unhandled promise rejections and exceptions.
// Log the error and let the process continue serving.
process.on("unhandledRejection", (reason) => {
	logger.error(`Unhandled promise rejection (process will continue): ${reason}`);
});

process.on("uncaughtException", (error) => {
	logger.error(`Uncaught exception (process will continue): ${error}`);
});

Bun.serve({
	fetch: server.fetch,
	port: PORT,
	idleTimeout: 120,
	maxRequestBodySize: 50 * 1024 * 1024, // 50MB
	error(error) {
		logger.error(`Server error: ${error}`);
		return new Response(
			JSON.stringify({
				success: false,
				code: 500,
				error: "Internal server error",
			}),
			{
				status: 500,
				headers: { "Content-Type": "application/json" },
			},
		);
	},
});

logger.info(`Server started at port: ${PORT}`);
