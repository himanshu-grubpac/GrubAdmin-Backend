import { Hono } from "hono";
import { cors } from "hono/cors";
import { networkLogger } from "@/middlewares/network-logger";
import { ALLOWED_ORIGINS, FRONTEND_URL, NODE_ENV, loadEnv } from "@/configs/env.ts";
import { logger } from "@/utils/logger";
import { router } from "@/modules";
import { connectMongoDB, isMongoConnected, isPrismaConnected } from "./db";
import { globalErrorHandler } from "./middlewares/error";
import { nullifyEmptyStrings } from "@/utils/clean-query.ts";

export const server = new Hono().basePath("/api/v1");

loadEnv();

// Track readiness — starts false, becomes true once database connections are ready.
let isReady = false;

// ── Readiness gate middleware ───────────────────────────────────────────────
// Reject all requests (except health checks and CORS preflight) until databases
// are connected. This prevents Mongoose buffering timeouts and Prisma query
// failures during startup, and provides clear "not ready" errors instead of
// 502/504 timeouts.
server.use("*", async (c, next) => {
    const path = c.req.path;
    const method = c.req.method;

    // Always allow health/readiness checks and CORS preflight
    const allowed = [
        "/api/v1/common/health",
        "/api/v1/common/healthz",
        "/api/v1/common/readyz",
        "/common/health",
        "/common/healthz",
        "/common/readyz",
    ];

    if (allowed.includes(path) || method === "OPTIONS") {
        return next();
    }

    if (!isReady) {
        logger.warn(`Request rejected — server not ready: ${method} ${path}`);
        return c.json(
            {
                success: false,
                code: 503,
                error: "Service is starting up. Please try again shortly.",
            },
            { status: 503 },
        );
    }

    return next();
});

server.use(
    cors({
        origin: (origin) => {
            if (!origin) {
                return null;
            }

            if (ALLOWED_ORIGINS.includes(origin)) {
                return origin;
            }

            if (FRONTEND_URL && origin === FRONTEND_URL) {
                return origin;
            }

            if (NODE_ENV === "development" && origin === "http://localhost:3000") {
                return origin;
            }

            logger.warn(`[CORS] Blocked request from origin: ${origin}. Allowed origins: ${ALLOWED_ORIGINS.join(", ")}`);

            return null;
        },
        allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        allowHeaders: ["Content-Type", "Authorization", "Accept", "X-Requested-With"],
        credentials: true,
    }),
);
server.use(networkLogger);
server.use("*", async (c, next) => {
    const originalJson = c.json.bind(c);
    (c as any).json = (data: any, ...args: any[]) => {
        const cleanedData = nullifyEmptyStrings(data);
        return originalJson(cleanedData, ...args);
    };
    await next();
});

server.onError(globalErrorHandler);

server.route("/", router);

// ── Database Connection Initialization ──────────────────────────────────────
// Start MongoDB connection and wait for it (with timeout) before marking the
// server as ready. This eliminates the race condition where requests arrive
// before MongoDB is connected, which caused the "buffering timed out" errors.
(async () => {
    const MONGO_STARTUP_TIMEOUT_MS = parseInt(
        process.env.MONGO_STARTUP_TIMEOUT_MS || "15000",
        10,
    );

    try {
        await connectMongoDB();
    } catch (err) {
        logger.error(`MongoDB initialization failed: ${err}`);
        logger.warn("Server will proceed without MongoDB. MongoDB-dependent features will fail immediately (buffering disabled).");
    }

    // Brief pause for Prisma connection heartbeat (it may have connected at import time)
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Mark as ready regardless of individual DB states.
    // Health/readiness checks will report specific database statuses.
    isReady = true;
    logger.info(`Server ready — MongoDB: ${isMongoConnected() ? "connected" : "disconnected"}, Prisma: ${isPrismaConnected() ? "connected" : "disconnected"}`);
})();

export default server;
export { isReady };
