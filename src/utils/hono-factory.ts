import { createFactory } from "hono/factory";

const { createHandlers, createMiddleware } = createFactory();

export { createMiddleware, createHandlers };
