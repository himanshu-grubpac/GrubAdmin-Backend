import { APIError } from "@/types/error";
import { createMiddleware } from "hono/factory";

export const browserMiddleware = createMiddleware<{
	Variables: {
		uid: string;
		browser?: string;
		device?: string;
	};
}>(async (context, next) => {
	const uid = context.req.header("x-uid");
	const browser = context.req.header("x-browser");
	const device = context.req.header("x-device");

	if (!uid) {
		throw new APIError("No device id provided!", undefined, undefined, 400);
	}

	context.set("uid", uid);
	context.set("browser", browser);
	context.set("device", device);

	return next();
});
