import { Hono } from "hono";
import { cors } from "hono/cors";
import { networkLogger } from "@/middlewares/network-logger";
import { ALLOWED_ORIGINS, FRONTEND_URL, NODE_ENV, loadEnv } from "@/configs/env.ts";
import { logger } from "@/utils/logger";
import { router } from "@/modules";
import { connectMongoDB, initializeDatabases, isMongoConnected, isPrismaConnected, isDatabaseReady } from "./db";
import { globalErrorHandler } from "./middlewares/error";
import { nullifyEmptyStrings } from "@/utils/clean-query.ts";
import { randomUUID } from "crypto";

export const server = new Hono().basePath("/api/v1");

loadEnv();

// ── Readiness state ─────────────────────────────────────────────────────────
// Tracks whether the server can serve traffic.  Starts false and only
// becomes true after BOTH Prisma and MongoDB connections are attempted.
let isReady = false;

// Readiness gate middleware — reject all requests until databases are connected.
// This eliminates the race condition where requests arrive before the DB is
// ready, which caused "buffering timed out" errors and 502s.
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
                retryAfter: 5,
            },
            { status: 503, headers: { "Retry-After": "5" } },
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

// Request ID middleware — attach a unique request_id for structured logging
server.use("*", async (c, next) => {
    const requestId = randomUUID();
    (c as any).requestId = requestId;
    c.header("X-Request-Id", requestId);
    await next();
});

server.onError(globalErrorHandler);

server.route("/", router);

// ── Database Connection Initialization ──────────────────────────────────────
// Start both database connections and wait for them before marking the
// server as ready.  This eliminates the race condition where requests arrive
// before databases are connected.
(async () => {
    try {
        await initializeDatabases();
    } catch (err) {
        logger.error(`Database initialization failed: ${err}`);
        logger.warn("Server will proceed without MySQL. Prisma queries will fail immediately.");
    }

    try {
        await connectMongoDB();
    } catch (err) {
        logger.error(`MongoDB initialization failed: ${err}`);
        logger.warn("Server will proceed without MongoDB. MongoDB-dependent features will fail immediately.");
    }

    // Mark as ready — traffic is now accepted.
    // Individual database statuses are reported by readiness checks.
    isReady = true;
    logger.info(`Server ready — MySQL: ${isPrismaConnected() ? "connected" : "disconnected"}, MongoDB: ${isMongoConnected() ? "connected" : "disconnected"}`);
})();

export default server;
export { isReady };
