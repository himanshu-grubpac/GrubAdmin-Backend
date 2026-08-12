import { logger } from "@/utils/logger";
import dotenv from "dotenv";
import path from "path";

// Load environment variables from .env file.
// In production, load .env.production if it exists.
// In development, load .env (default dotenv behavior).
// dotenv does NOT override existing env vars, so explicit env vars take priority.
const envFile = process.env.NODE_ENV === "production" ? ".env.production" : ".env";
const envPath = path.resolve(process.cwd(), envFile);
dotenv.config({ path: envPath });

export const PORT = process.env.PORT as string;
export const NODE_ENV = process.env.NODE_ENV || "development";
export const DATABASE_URL = process.env.DATABASE_URL as string;

export const MONGO_URI = process.env.MONGO_URI as string;
export const MAIL = process.env.MAIL as string;
export const MAIL_PASS = process.env.MAIL_PASS as string;
export const MAIL_MIRROR = process.env.MAIL_MIRROR as string;
export const MAIL_MIRROR_PASS = process.env.MAIL_MIRROR_PASS as string;
export const AUTH_SECRET = process.env.AUTH_SECRET as string;
export const DELIVERY_AUTH_SECRET = process.env.DELIVERY_AUTH_SECRET as string;
export const MEDICAL_AUTH_SECRET = process.env.MEDICAL_AUTH_SECRET as string;
export const HOSPITALITY_AUTH_SECRET = process.env.HOSPITALITY_AUTH_SECRET as string;
export const CAMPING_AUTH_SECRET = process.env.CAMPING_AUTH_SECRET as string;

// JWT Token Expiration Settings (in seconds)
export const JWT_ACCESS_TOKEN_EXPIRY = parseInt(process.env.JWT_ACCESS_TOKEN_EXPIRY || "86400"); // Default: 24 hours
export const JWT_REFRESH_TOKEN_EXPIRY = parseInt(process.env.JWT_REFRESH_TOKEN_EXPIRY || "604800"); // Default: 7 days

export const SEED_EMAIL = process.env.SEED_EMAIL as string;
export const SEED_PASSWORD = process.env.SEED_PASSWORD as string;
export const SEED_NAME = process.env.SEED_NAME as string;
export const SEED_LAST_NAME = process.env.SEED_LAST_NAME as string;
export const SEED_COUNTRY_CODE = process.env.SEED_COUNTRY_CODE as string;
export const SEED_MOBILE_NUMBER = process.env.SEED_MOBILE_NUMBER as string;

export const AWS_KEY = process.env.AWS_KEY as string;
export const AWS_SECRET = process.env.AWS_SECRET as string;
export const AWS_REGION = process.env.AWS_REGION as string;

export const AWS_BUCKET_NAME = process.env.AWS_BUCKET_NAME as string;

/** S3 key prefix for camp consumer camera objects (e.g. `camp-camera`). */
export const CAMERA_S3_PREFIX = process.env.CAMERA_S3_PREFIX || "camp-camera";

/** Optional legacy web share page base URL — unused by native share (Option A). */
export const MEDICAL_MOBILE_SHARE_BASE_URL = process.env.MEDICAL_MOBILE_SHARE_BASE_URL as
	| string
	| undefined;

/** Optional simulator default coordinates when GPS is on but lat/lng omitted. */
export const SIMULATOR_DEFAULT_LAT = process.env.SIMULATOR_DEFAULT_LAT;
export const SIMULATOR_DEFAULT_LNG = process.env.SIMULATOR_DEFAULT_LNG;

/** Production values: see .env.production.example (IPs removed from code). */
export const FRONTEND_URL = process.env.FRONTEND_URL as string;
/** Hospitality portal origin — optional in dev (falls back to http://localhost:3000); required in production. */
export const HOSPITALITY_FRONTEND_URL = process.env.HOSPITALITY_FRONTEND_URL as string | undefined;
/** Shared admin/client dashboard URL; hospitality fallback when HOSPITALITY_FRONTEND_URL is unset. Production: .env.production.example */
export const CLIENT_DASHBOARD_URL = process.env.CLIENT_DASHBOARD_URL as string;

export const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY as string;
export const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "").split(",").map(o => o.trim()).filter(Boolean);

export const loadEnv = (): void => {
	const requiredEnvVars = [
		"PORT",
		"DATABASE_URL",
		"MONGO_URI",
		"MAIL",
		"MAIL_PASS",
		"AUTH_SECRET",
		"DELIVERY_AUTH_SECRET",
		"HOSPITALITY_AUTH_SECRET",
		"CAMPING_AUTH_SECRET",
		"AWS_KEY",
		"AWS_REGION",
		"AWS_BUCKET_NAME",
		"AWS_SECRET",
		// "GOOGLE_MAPS_API_KEY",
		"ALLOWED_ORIGINS",
	];

	const missingVars: string[] = [];

	for (const envVar of requiredEnvVars) {
		if (!process.env[envVar]) {
			missingVars.push(envVar);
		}
	}
	if (missingVars.length > 0) {
		const errorMessage = `Missing required environment variables: ${missingVars.join(", ")}`;
		logger.error(`❌ Environment Configuration Error: ${errorMessage}`);
		logger.error(
			"Please ensure all required environment variables are set in your .env file",
		);
		process.exit(1);
	}

	logger.info("✅ All environment variables are properly configured");
};
