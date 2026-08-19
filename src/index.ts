import server from "@/app";
import { logger } from "@/utils/logger";
import { PORT } from "@/configs/env";
import { prisma } from "@/db";
import mongoose from "mongoose";

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

let shuttingDown = false;

/** Max ms for HTTP drain + DB teardown before force exit. Override via SHUTDOWN_GRACE_MS. */
const SHUTDOWN_GRACE_MS = clampShutdownGraceMs(
	parseInt(process.env.SHUTDOWN_GRACE_MS || "15000", 10),
);

function clampShutdownGraceMs(value: number): number {
	if (!Number.isFinite(value)) {
		return 15_000;
	}
	return Math.min(60_000, Math.max(1_000, value));
}

// PM2 sends SIGTERM on restart/stop. Set kill_timeout >= SHUTDOWN_GRACE_MS (default 15000),
// e.g. `pm2 start ... --kill-timeout 15000` or ecosystem `kill_timeout: 15000`.
async function gracefulShutdown(signal: string): Promise<void> {
	if (shuttingDown) {
		logger.info(`Ignoring duplicate ${signal} during shutdown`);
		return;
	}
	shuttingDown = true;

	logger.info(`Received ${signal}, starting graceful shutdown`, {
		gracePeriodMs: SHUTDOWN_GRACE_MS,
	});

	const shutdownWork = async (): Promise<void> => {
		logger.info("Stopping HTTP server (no new connections; draining in-flight requests)");
		await bunServer.stop();

		logger.info("Disconnecting MySQL (Prisma)");
		await prisma.$disconnect().catch((err) => {
			logger.warn("Prisma disconnect failed during shutdown", {
				message: err instanceof Error ? err.message : String(err),
			});
		});

		if (mongoose.connection.readyState !== 0) {
			logger.info("Disconnecting MongoDB");
			await mongoose.disconnect().catch((err) => {
				logger.warn("MongoDB disconnect failed during shutdown", {
					message: err instanceof Error ? err.message : String(err),
				});
			});
		}
	};

	let timeoutId: ReturnType<typeof setTimeout> | undefined;
	const graceTimeout = new Promise<never>((_, reject) => {
		timeoutId = setTimeout(
			() => reject(new Error(`Shutdown exceeded ${SHUTDOWN_GRACE_MS}ms grace period`)),
			SHUTDOWN_GRACE_MS,
		);
	});

	try {
		await Promise.race([shutdownWork(), graceTimeout]);
		logger.info("Graceful shutdown complete");
		process.exit(0);
	} catch (error) {
		logger.error("Graceful shutdown failed or timed out", {
			message: error instanceof Error ? error.message : String(error),
		});
		process.exit(1);
	} finally {
		if (timeoutId) {
			clearTimeout(timeoutId);
		}
	}
}

const bunServer = Bun.serve({
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

process.on("SIGTERM", () => {
	void gracefulShutdown("SIGTERM");
});

process.on("SIGINT", () => {
	void gracefulShutdown("SIGINT");
});

logger.info(`Server started at port: ${PORT}`);
