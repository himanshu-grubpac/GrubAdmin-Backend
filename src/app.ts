import { Hono } from "hono";
import { cors } from "hono/cors";
import { networkLogger } from "@/middlewares/network-logger";
import { ALLOWED_ORIGINS, FRONTEND_URL, NODE_ENV, loadEnv } from "@/configs/env.ts";
import { logger } from "@/utils/logger";
import { router } from "@/modules";
import { connectMongoDB } from "./db";
import { globalErrorHandler } from "./middlewares/error";
import { nullifyEmptyStrings } from "@/utils/clean-query.ts";

export const server = new Hono().basePath("/api/v1");

loadEnv();

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

// Track readiness: the server can serve requests once routes are registered
let isReady = true;

// Start MongoDB connection in the background — do NOT block server startup.
// If MongoDB is slow or unavailable, the server is still reachable and can
// serve login requests that don't depend on Mongo (adminLogger gracefully
// degrades when MongoDB is down).
connectMongoDB().then(() => {
    logger.info("MongoDB background connection completed");
}).catch((err) => {
    logger.error(`MongoDB background connection failed: ${err}`);
});

export default server;
export { isReady };
