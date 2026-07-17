import server from "@/app";
import { logger } from "@/utils/logger";
import { PORT } from "@/configs/env";

// Prevent process crashes from unhandled promise rejections and exceptions.
// Log the error with full context and let the process continue serving.
process.on("unhandledRejection", (reason, promise) => {
	logger.error("Unhandled promise rejection (process will continue)", {
		reason: reason instanceof Error ? reason.message : String(reason),
		stack: reason instanceof Error ? reason.stack : undefined,
	});
});

process.on("uncaughtException", (error) => {
	logger.error("Uncaught exception (process will continue)", {
		message: error.message,
		stack: error.stack,
	});
});

Bun.serve({
	fetch: server.fetch,
	port: PORT,
	idleTimeout: 120,
	maxRequestBodySize: 50 * 1024 * 1024, // 50MB
	error(error: Error) {
		logger.error(`Server error: ${error.message}`, {
			stack: error.stack,
		});
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
