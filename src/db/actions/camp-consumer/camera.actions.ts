import { prisma } from "@/db";
import { resolveConsumerBoxById } from "@/db/actions/camp-consumer/box.actions.ts";
import { AWS_BUCKET_NAME, CAMERA_S3_PREFIX } from "@/configs/env.ts";
import { services } from "@/services";
import { APIError } from "@/types/error";
import { ulid } from "ulid";
import type {
	CampingCameraFeed,
	CampingCameraFeedRegisterData,
	CampingCameraFeedsData,
	CampingCameraLiveData,
	CampingCameraStreamData,
	CampingCameraUploadUrlData,
	CampingSurveillanceModeData,
} from "@/types/camping-mobile/camera";

const PRESIGN_SECONDS = 15 * 60;

const buildExpiry = (seconds = PRESIGN_SECONDS): string =>
	new Date(Date.now() + seconds * 1000).toISOString();

export const buildClientBoxPrefix = (client_id: string, box_id: string): string =>
	`${CAMERA_S3_PREFIX}/camp-consumer/clients/${client_id}/boxes/${box_id}`;

export const buildLiveKey = (client_id: string, box_id: string, cam_id: number): string =>
	`${buildClientBoxPrefix(client_id, box_id)}/cam${cam_id}/live.m3u8`;

export const buildRecordingKey = (
	client_id: string,
	box_id: string,
	cam_id: number,
	feed_id: string,
): string =>
	`${buildClientBoxPrefix(client_id, box_id)}/cam${cam_id}/recordings/${feed_id}/index.m3u8`;

export const buildThumbnailKey = (
	client_id: string,
	box_id: string,
	cam_id: number,
	feed_id: string,
	filename = "thumbnail.jpg",
): string => {
	const safeName = filename.replace(/[^a-zA-Z0-9.\-_]/g, "_");
	return `${buildClientBoxPrefix(client_id, box_id)}/cam${cam_id}/recordings/${feed_id}/${safeName}`;
};

export const assertKeyBelongsToClient = (
	key: string,
	client_id: string,
	box_id: string,
): void => {
	const expectedPrefix = `${buildClientBoxPrefix(client_id, box_id)}/`;
	if (!key.startsWith(expectedPrefix)) {
		throw new APIError("Invalid camera object key", "camp.camera.INVALID_KEY", undefined, 403);
	}
};

const extractRecordingFeedId = (
	s3_key: string,
	client_id: string,
	box_id: string,
	cam_id: number,
): string | null => {
	const prefix = `${buildClientBoxPrefix(client_id, box_id)}/cam${cam_id}/recordings/`;
	if (!s3_key.startsWith(prefix) || !s3_key.endsWith("/index.m3u8")) {
		return null;
	}
	const feed_id = s3_key.slice(prefix.length, -"/index.m3u8".length);
	return feed_id.length > 0 ? feed_id : null;
};

const assertCameraBucketConfigured = (): void => {
	if (!AWS_BUCKET_NAME) {
		throw new APIError(
			"Camera storage is not configured",
			"camp.camera.NOT_CONFIGURED",
			undefined,
			503,
		);
	}
};

const presignObjectKey = async (
	key: string,
	client_id: string,
	box_id: string,
): Promise<string> => {
	assertCameraBucketConfigured();
	assertKeyBelongsToClient(key, client_id, box_id);
	const exists = await services.s3.objectExists(key);
	if (!exists) {
		throw new APIError("Camera stream is not available", "camp.camera.NOT_FOUND", undefined, 404);
	}
	return services.s3.getPresignedUrl(key, PRESIGN_SECONDS);
};

const resolveBoxClientId = (client_id: string | null | undefined): string => {
	if (!client_id) {
		throw new APIError(
			"Box client is not configured",
			"camp.camera.NOT_CONFIGURED",
			undefined,
			503,
		);
	}
	return client_id;
};

const parseFeedDateRange = (date?: string): { gte?: Date; lt?: Date } | undefined => {
	if (!date) return undefined;
	const start = new Date(`${date}T00:00:00.000Z`);
	if (Number.isNaN(start.getTime())) {
		throw new APIError("Invalid date filter", undefined, undefined, 400);
	}
	const end = new Date(start);
	end.setUTCDate(end.getUTCDate() + 1);
	return { gte: start, lt: end };
};

const resolveUploadContentType = (kind: "live" | "recording" | "thumbnail", filename?: string): string => {
	if (kind === "thumbnail") {
		const lower = (filename ?? "thumbnail.jpg").toLowerCase();
		if (lower.endsWith(".png")) return "image/png";
		if (lower.endsWith(".webp")) return "image/webp";
		return "image/jpeg";
	}
	return "application/vnd.apple.mpegurl";
};

export const getConsumerCameraLive = async (args: {
	box_id: string;
	consumer_id: string;
	client_id?: string | null;
	cam?: number;
}): Promise<CampingCameraLiveData> => {
	const { box } = await resolveConsumerBoxById(args);
	const client_id = resolveBoxClientId(box.client_id);
	const cam_id = args.cam ?? 1;

	if (cam_id < 1 || cam_id > 4) {
		throw new APIError("Camera id must be between 1 and 4", undefined, undefined, 400);
	}

	const telemetry = await prisma.box_telemetry_latest.findUnique({
		where: { box_id: args.box_id },
		select: { camera_status: true, surveillance_enabled: true },
	});

	if (telemetry?.camera_status !== "on") {
		throw new APIError("Live camera is not available", "camp.camera.NOT_FOUND", undefined, 404);
	}

	const stream_url = await presignObjectKey(
		buildLiveKey(client_id, args.box_id, cam_id),
		client_id,
		args.box_id,
	);
	const surveillance = telemetry?.surveillance_enabled ?? false;

	return {
		stream_url,
		expires_at: buildExpiry(),
		mode: surveillance ? "surveillance" : "live",
		cam_id,
		box_display_id: box.box_display_id,
	};
};

export const listConsumerCameraFeeds = async (args: {
	box_id: string;
	consumer_id: string;
	client_id?: string | null;
	date?: string;
	cam?: number;
}): Promise<CampingCameraFeedsData> => {
	const { box } = await resolveConsumerBoxById(args);
	const client_id = resolveBoxClientId(box.client_id);

	const recordedAt = parseFeedDateRange(args.date);
	const camFilter = args.cam != null ? { cam_id: args.cam } : {};

	const rows = await prisma.camp_camera_feed.findMany({
		where: {
			box_id: args.box_id,
			...camFilter,
			...(recordedAt ? { recorded_at: recordedAt } : {}),
		},
		orderBy: { recorded_at: "desc" },
		take: 50,
	});

	const feeds: CampingCameraFeed[] = [];

	for (const row of rows) {
		let thumbnail_url: string | null = null;
		if (row.thumbnail_key) {
			try {
				thumbnail_url = await presignObjectKey(row.thumbnail_key, client_id, args.box_id);
			} catch {
				thumbnail_url = null;
			}
		}

		feeds.push({
			feed_id: row.id,
			title: `Cam ${row.cam_id} recording`,
			recorded_at: row.recorded_at.toISOString(),
			duration_seconds: row.duration_sec ?? 0,
			thumbnail_url,
			cam_id: row.cam_id,
		});
	}

	return { feeds };
};

export const getConsumerCameraStream = async (args: {
	box_id: string;
	feed_id: string;
	consumer_id: string;
	client_id?: string | null;
}): Promise<CampingCameraStreamData> => {
	const { box } = await resolveConsumerBoxById(args);
	const client_id = resolveBoxClientId(box.client_id);

	const feed = await prisma.camp_camera_feed.findFirst({
		where: { id: args.feed_id, box_id: args.box_id },
	});

	if (!feed) {
		throw new APIError("Camera feed not found", "camp.camera.NOT_FOUND", undefined, 404);
	}

	const stream_url = await presignObjectKey(feed.s3_key, client_id, args.box_id);
	let download_url: string | null = null;
	try {
		download_url = await presignObjectKey(feed.s3_key, client_id, args.box_id);
	} catch {
		download_url = null;
	}

	return {
		feed_id: feed.id,
		stream_url,
		download_url,
		expires_at: buildExpiry(),
		cam_id: feed.cam_id,
	};
};

export const createConsumerCameraUploadUrl = async (args: {
	box_id: string;
	consumer_id: string;
	client_id?: string | null;
	kind: "live" | "recording" | "thumbnail";
	cam_id: number;
	feed_id?: string;
	filename?: string;
}): Promise<CampingCameraUploadUrlData> => {
	const { box } = await resolveConsumerBoxById(args);
	const client_id = resolveBoxClientId(box.client_id);

	if (args.cam_id < 1 || args.cam_id > 4) {
		throw new APIError("Camera id must be between 1 and 4", undefined, undefined, 400);
	}

	assertCameraBucketConfigured();

	let s3_key: string;
	let feed_id = args.feed_id?.trim() || undefined;

	if (args.kind === "live") {
		s3_key = buildLiveKey(client_id, args.box_id, args.cam_id);
	} else {
		feed_id = feed_id ?? ulid();
		if (args.kind === "recording") {
			s3_key = buildRecordingKey(client_id, args.box_id, args.cam_id, feed_id);
		} else {
			s3_key = buildThumbnailKey(
				client_id,
				args.box_id,
				args.cam_id,
				feed_id,
				args.filename,
			);
		}
	}

	assertKeyBelongsToClient(s3_key, client_id, args.box_id);

	const contentType = resolveUploadContentType(args.kind, args.filename);
	const upload_url = await services.s3.getPresignedPutUrl(s3_key, contentType, PRESIGN_SECONDS);

	return {
		upload_url,
		s3_key,
		expires_at: buildExpiry(),
		feed_id: feed_id ?? null,
		cam_id: args.cam_id,
		kind: args.kind,
	};
};

export const registerConsumerCameraFeed = async (args: {
	box_id: string;
	consumer_id: string;
	client_id?: string | null;
	cam_id: number;
	s3_key: string;
	thumbnail_key?: string | null;
	recorded_at: string;
	duration_sec?: number | null;
}): Promise<CampingCameraFeedRegisterData> => {
	const { box } = await resolveConsumerBoxById(args);
	const client_id = resolveBoxClientId(box.client_id);

	if (args.cam_id < 1 || args.cam_id > 4) {
		throw new APIError("Camera id must be between 1 and 4", undefined, undefined, 400);
	}

	assertKeyBelongsToClient(args.s3_key, client_id, args.box_id);
	if (args.thumbnail_key) {
		assertKeyBelongsToClient(args.thumbnail_key, client_id, args.box_id);
	}

	const feed_id = extractRecordingFeedId(args.s3_key, client_id, args.box_id, args.cam_id);
	if (!feed_id) {
		throw new APIError(
			"s3_key must be a recording index path for this box and camera",
			"camp.camera.INVALID_KEY",
			undefined,
			400,
		);
	}

	const recordedAt = new Date(args.recorded_at);
	if (Number.isNaN(recordedAt.getTime())) {
		throw new APIError("Invalid recorded_at timestamp", undefined, undefined, 400);
	}

	const existing = await prisma.camp_camera_feed.findFirst({
		where: { id: feed_id, box_id: args.box_id },
		select: { id: true },
	});
	if (existing) {
		throw new APIError("Camera feed already registered", "camp.camera.FEED_EXISTS", undefined, 409);
	}

	const feed = await prisma.camp_camera_feed.create({
		data: {
			id: feed_id,
			box_id: args.box_id,
			cam_id: args.cam_id,
			s3_key: args.s3_key,
			thumbnail_key: args.thumbnail_key ?? null,
			recorded_at: recordedAt,
			duration_sec: args.duration_sec ?? null,
		},
	});

	return {
		feed_id: feed.id,
		cam_id: feed.cam_id,
		s3_key: feed.s3_key,
		thumbnail_key: feed.thumbnail_key,
		recorded_at: feed.recorded_at.toISOString(),
		duration_sec: feed.duration_sec,
	};
};

export const patchConsumerSurveillanceMode = async (args: {
	box_id: string;
	consumer_id: string;
	client_id?: string | null;
	enabled: boolean;
}): Promise<CampingSurveillanceModeData> => {
	await resolveConsumerBoxById(args);

	await prisma.box_telemetry_latest.upsert({
		where: { box_id: args.box_id },
		update: { surveillance_enabled: args.enabled },
		create: {
			box_id: args.box_id,
			surveillance_enabled: args.enabled,
		},
	});

	return { surveillance_enabled: args.enabled };
};

/** @deprecated No-op — surveillance state is DB-backed. Kept for test compatibility. */
export const __resetSurveillanceStateForTests = (): void => {};
