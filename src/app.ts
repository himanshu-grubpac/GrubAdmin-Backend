import { Hono } from "hono";
import { cors } from "hono/cors";
import { networkLogger } from "@/middlewares/network-logger";
import { ALLOWED_ORIGINS, FRONTEND_URL, NODE_ENV, loadEnv } from "@/configs/env.ts";
import { router } from "@/modules";
import { connectMongoDB } from "./db";
import { globalErrorHandler } from "./middlewares/error";
import { nullifyEmptyStrings } from "@/utils/clean-query.ts";

export const server = new Hono().basePath("/api/v1");

loadEnv();

server.use(
    cors({
        origin: (origin) => {
            if (!origin) return null;

            if (ALLOWED_ORIGINS.includes(origin)) {
                return origin;
            }

            if (FRONTEND_URL && origin === FRONTEND_URL) {
                return origin;
            }

            if (NODE_ENV === "development" && origin === "http://localhost:3000") {
                return origin;
            }

            return null;
        },
        allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
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

await connectMongoDB();

server.route("/", router);

export default server;
