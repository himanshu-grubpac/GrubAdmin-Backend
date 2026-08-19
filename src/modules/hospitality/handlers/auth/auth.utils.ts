import { MAIL, FRONTEND_URL, CLIENT_DASHBOARD_URL, HOSPITALITY_FRONTEND_URL, NODE_ENV } from "@/configs/env.ts";
import { HOSPITALITY_VERTICAL_NAME } from "@/configs/constants";

export const normalizeAuthEmail = (email: string) => email.trim().toLowerCase();

export const buildHospitalityClientLookupWhere = (email: string) => {
	const normalized = normalizeAuthEmail(email);
	return {
		email: normalized,
		NOT: { email: null },
		vertical: {
			name: HOSPITALITY_VERTICAL_NAME,
		},
	};
};

/** Reject hospitality clients whose stored email is null/empty (HOSP-062). */
export const assertHospitalityClientHasEmail = <T extends { email: string | null }>(
	clientRecord: T | null | undefined,
): clientRecord is T & { email: string } => {
	return Boolean(clientRecord?.email?.trim());
};

export const maskAuthEmail = (email: string) => {
	const normalized = email.trim();
	const atIndex = normalized.indexOf("@");
	if (atIndex <= 0) return "***";
	const local = normalized.slice(0, atIndex);
	const domain = normalized.slice(atIndex + 1);
	const maskedLocal = local.length <= 1 ? "*" : `${local[0]}***`;
	return `${maskedLocal}@${domain}`;
};

/**
 * Dev-only OTP console log for local testing when SMTP is unavailable.
 * Requires BOTH NODE_ENV=development AND HOSPITALITY_OTP_DEV_LOG=true.
 * Never logs in production; never writes OTP to structured/app logs.
 */
export const isHospitalityOtpDevLogEnabled = (): boolean =>
	NODE_ENV === "development" && process.env.HOSPITALITY_OTP_DEV_LOG === "true";

export const logHospitalityOtpDev = (args: {
	email: string;
	otp: string;
	otp_id: string;
	for_what: string;
}): void => {
	if (!isHospitalityOtpDevLogEnabled()) return;
	console.info(
		`[HOSPITALITY_OTP_DEV] for_what=${args.for_what} otp_id=${args.otp_id} email=${maskAuthEmail(args.email)} otp=${args.otp}`,
	);
};

/** Prefer first+last / full name; fall back to email local-part so greetings are never blank when identity data exists. */
export const resolveHospitalityDisplayName = (args: {
	firstName?: string | null;
	lastName?: string | null;
	fullName?: string | null;
	email?: string | null;
}): string => {
	const first = (args.firstName || "").trim();
	const last = (args.lastName || "").trim();
	const fromParts = [first, last].filter(Boolean).join(" ").trim();
	if (fromParts) return fromParts;

	const full = (args.fullName || "").trim();
	if (full) return full;

	const email = (args.email || "").trim();
	if (email) {
		const at = email.indexOf("@");
		const local = (at > 0 ? email.slice(0, at) : email).trim();
		if (local) return local;
	}

	return "";
};

export const getHospitalityMailFrom = () => {
	if (MAIL) return MAIL;
	if (NODE_ENV !== "production") return "support@sqaby.com";
	throw new Error("MAIL environment variable is not configured");
};

/** Production URL values: .env.production.example (no hardcoded IPs in code). */
export const getHospitalityFrontendUrl = (): string => {
	const url =
		HOSPITALITY_FRONTEND_URL ||
		CLIENT_DASHBOARD_URL ||
		FRONTEND_URL ||
		(NODE_ENV !== "production" ? "http://localhost:3000" : undefined);
	if (!url) {
		throw new Error(
			"Hospitality frontend URL is not configured. Set HOSPITALITY_FRONTEND_URL, CLIENT_DASHBOARD_URL, or FRONTEND_URL.",
		);
	}
	return url.replace(/\/$/, "");
};

export const getHospitalityOtpCookieOptions = () => ({
	path: "/",
	httpOnly: true,
	maxAge: 60 * 5,
	sameSite: "Lax" as const,
	secure: NODE_ENV === "production",
});
