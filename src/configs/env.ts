import { logger } from "@/utils/logger";

export const PORT = process.env.PORT as string;
export const NODE_ENV = process.env.NODE_ENV || "development";
export const DATABASE_URL = process.env.DATABASE_URL as string;

export const MONGO_URI = process.env.MONGO_URI as string;
export const MAIL = process.env.MAIL as string;
export const MAIL_PASS = process.env.MAIL_PASS as string;
export const MAIL_MIRROR = process.env.MAIL_MIRROR as string;
export const MAIL_MIRROR_PASS = process.env.MAIL_MIRROR_PASS as string;
export const AUTH_SECRET = process.env.AUTH_SECRET as string;

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

export const FRONTEND_URL = process.env.FRONTEND_URL as string;

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
		logger.error("❌ Environment Configuration Error:", errorMessage);
		logger.error(
			"Please ensure all required environment variables are set in your .env file",
		);
		process.exit(1);
	}

	logger.info("✅ All environment variables are properly configured");
};
