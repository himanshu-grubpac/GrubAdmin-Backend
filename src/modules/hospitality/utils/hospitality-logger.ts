import type { Context } from "hono";
import { logger } from "@/utils/logger";

type HospitalityLogLevel = "info" | "warn" | "error";

export interface HospitalityLogContext {
	request_id?: string;
	client_id?: string;
	route?: string;
}

function resolveHospitalityLogContext(context?: Context): HospitalityLogContext {
	if (!context) return {};

	const requestId =
		context.get("hospitalityRequestId") ??
		(context as { requestId?: string }).requestId;

	const clientId = context.var?.client_id as string | undefined;

	return {
		request_id: requestId,
		client_id: clientId,
		route: context.req.path,
	};
}

function emitStructuredLog(
	level: HospitalityLogLevel,
	event: string,
	fields: Record<string, unknown>,
): void {
	logger[level](JSON.stringify({ event, ...fields }));
}

/** Structured hospitality handler log — never pass email, token, password, or OTP. */
export function logHospitality(
	context: Context | undefined,
	level: HospitalityLogLevel,
	event: string,
	fields: Record<string, unknown> = {},
): void {
	emitStructuredLog(level, event, {
		...resolveHospitalityLogContext(context),
		...fields,
	});
}

/** For async callbacks (mail queue) that only have request metadata, not full Context. */
export function logHospitalityScoped(
	level: HospitalityLogLevel,
	event: string,
	scope: HospitalityLogContext,
	fields: Record<string, unknown> = {},
): void {
	emitStructuredLog(level, event, { ...scope, ...fields });
}

export function getHospitalityLogScope(context: Context): HospitalityLogContext {
	return resolveHospitalityLogContext(context);
}
