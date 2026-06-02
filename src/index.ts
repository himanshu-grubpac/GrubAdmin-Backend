import server from "@/app";
import { logger } from "@/utils/logger";
import { PORT } from "@/configs/env";

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

logger.info(`🌐 Server started at port: ${PORT}`);
