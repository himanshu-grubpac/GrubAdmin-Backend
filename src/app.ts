import { Hono } from "hono";
import { cors } from "hono/cors";
import { networkLogger } from "@/middlewares/network-logger";
import { ALLOWED_ORIGINS, loadEnv } from "@/configs/env.ts";
import { router } from "@/modules";
import { connectMongoDB } from "./db";
import { globalErrorHandler } from "./middlewares/error";
import { nullifyEmptyStrings } from "@/utils/clean-query.ts";

export const server = new Hono().basePath("/api/v1");

loadEnv();

server.use(
    cors({
        origin: (origin) => {
            if (!origin || ALLOWED_ORIGINS.includes(origin) || origin.startsWith("http://localhost:")) {
                return origin;
            }
            return ALLOWED_ORIGINS[0] || "*";
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
