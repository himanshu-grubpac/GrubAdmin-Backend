import { createMiddleware } from "hono/factory";
import { NODE_ENV } from "@/configs/env.ts";
import { DEFAULT_IP_ADDRESS } from "@/configs/constants.ts";

export const ipMiddleware = createMiddleware<{
	Variables: {
		ip?: string;
	};
}>(async (context, next) => {
	const ip =
		NODE_ENV === "production"
			? context.req.header("x-forwarded-for")?.split(",")[0] ||
				context.req.header("cf-connecting-ip") || // for Cloudflare
				context.req.header("x-real-ip")
			: DEFAULT_IP_ADDRESS;

	context.set("ip", ip);

	return next();
});
