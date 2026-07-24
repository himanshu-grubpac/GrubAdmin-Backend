import { AWS_BUCKET_NAME, AWS_REGION } from "@/configs/env.ts";
import { getConfigs } from "@/db/actions/config.actions.ts";

let cachedBaseUrl: string | null = null;
let lastConfigFetch = 0;
const CONFIG_CACHE_TTL = 60_000;

function buildDefaultBaseUrl(): string {
	return `https://${AWS_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com`;
}

export function encodeBucketKey(bucketKey: string): string {
	if (!bucketKey) return "";
	return bucketKey.split("/").map(encodeURIComponent).join("/");
}

export async function getAssetBaseUrl(): Promise<string> {
	const now = Date.now();
	if (cachedBaseUrl && now - lastConfigFetch < CONFIG_CACHE_TTL) {
		return cachedBaseUrl;
	}

	try {
		const configs = await getConfigs();
		const config = configs.find((c) => c.key === "icon_base_url");
		cachedBaseUrl = config?.value || buildDefaultBaseUrl();
	} catch {
		cachedBaseUrl = buildDefaultBaseUrl();
	}

	lastConfigFetch = Date.now();
	return cachedBaseUrl!;
}

export function buildAssetUrl(baseUrl: string | null | undefined, bucketKey: string | null | undefined): string {
	if (!bucketKey) return "";
	const base = (baseUrl || "").replace(/\/+$/, "");
	if (!base) return bucketKey;
	const encoded = encodeBucketKey(bucketKey);
	return `${base}/${encoded}`;
}

export async function resolveIconUrl(bucketKey: string | null | undefined): Promise<string> {
	if (!bucketKey) return "";
	const baseUrl = await getAssetBaseUrl();
	return buildAssetUrl(baseUrl, bucketKey);
}

// ── Response enrichment helpers ──────────────────────────────────────────────
// These helpers add a resolved icon_url to API responses so that every
// consumer (admin frontend, mobile apps) receives a ready-to-use URL
// alongside the raw bucket_key.

export function enrichIconResponse<T extends Record<string, unknown> & { bucket_key: string | null }>(
	icon: T | null,
	baseUrl: string,
): T & { icon_url: string } | null {
	if (!icon) return null;
	return { ...icon, icon_url: buildAssetUrl(baseUrl, icon.bucket_key) };
}

export function enrichFaqlCategoryResponse<T extends Record<string, unknown>>(
	category: T,
	baseUrl: string,
): T & { icon_url: string } {
	const rawIcon = (category as Record<string, unknown>).icon as { bucket_key: string | null; id: string | null; name: string | null } | null;
	// Replace null icon with a safe fallback to prevent consumers from
	// crashing when accessing icon.bucket_key on a category without an icon.
	const icon = rawIcon ?? { id: null, name: null, bucket_key: null };
	return {
		...category,
		icon,
		icon_url: rawIcon ? buildAssetUrl(baseUrl, rawIcon.bucket_key) : "",
	};
}

export async function enrichFaqCategoriesResponse<T extends Record<string, unknown>>(
	categories: T[],
): Promise<(T & { icon_url: string })[]> {
	const baseUrl = await getAssetBaseUrl();
	return categories.map((cat) => enrichFaqlCategoryResponse(cat, baseUrl));
}
