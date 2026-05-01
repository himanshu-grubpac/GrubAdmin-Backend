import server from "@/app";
import { logger } from "@/utils/logger";
import { PORT } from "@/configs/env";

Bun.serve({
	fetch: server.fetch,
	port: PORT,
});

logger.info(`🌐 Server started at port: ${PORT}`);
