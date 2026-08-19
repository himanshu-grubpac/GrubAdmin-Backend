import { createHandlers } from "@/utils/hono-factory.ts";
import { hospitalityAuthGuard } from "@/middlewares/auth";
import { settingsChangedAuditRequestBodyValidator } from "hospitality/validators/log.validators.ts";
import type { APIResponse } from "@/types/api";
import { GrubpacLog } from "@/db/mongo-schema";
import {
	buildSettingsChangedAuditPayload,
	deriveActionLabelFromLogs,
	fetchHospitalitySettingsChangedBoxes,
	formatSettingsChangedTimestamp,
	SETTINGS_CHANGED_LOG_TYPES,
	type SettingsChangedAuditPayload,
} from "hospitality/utils/settings-changed-display.ts";

const BATCH_WINDOW_MS = 60_000;

export const postSettingsChangedAuditHandler = createHandlers(
	hospitalityAuthGuard(),
	settingsChangedAuditRequestBodyValidator,
	async (context) => {
		const { client_id } = context.var;
		const { batch_id, box_ids, since } = context.req.valid("json");

		let logs: Array<{
			subject?: { id?: string };
			metadata?: Record<string, unknown> | null;
			type?: string;
			createdAt?: Date;
		}> = [];

		if (batch_id) {
			logs = await GrubpacLog.find({
				client_id,
				category: "GrubPac",
				"metadata.batch_id": batch_id,
				type: { $in: [...SETTINGS_CHANGED_LOG_TYPES] },
			})
				.sort({ createdAt: -1 })
				.limit(500)
				.lean();
		} else if (box_ids?.length) {
			const sinceDate = since ? new Date(since) : new Date(Date.now() - BATCH_WINDOW_MS);
			logs = await GrubpacLog.find({
				client_id,
				category: "GrubPac",
				"subject.id": { $in: box_ids },
				type: { $in: [...SETTINGS_CHANGED_LOG_TYPES] },
				createdAt: { $gte: sinceDate },
			})
				.sort({ createdAt: -1 })
				.limit(500)
				.lean();
		}

		if (logs.length === 0) {
			return context.json<APIResponse<SettingsChangedAuditPayload | null>>({
				success: true,
				code: 200,
				message: "No settings change audit found",
				data: {
					batch_id: batch_id ?? "",
					since: since ?? new Date().toISOString(),
					timestamp: "",
					action_label: "",
					boxes: [],
				},
			});
		}

		const latestAt = logs.reduce((max, log) => {
			const ts = log.createdAt ? new Date(log.createdAt).getTime() : 0;
			return Math.max(max, ts);
		}, 0);

		const batchLogs = batch_id
			? logs
			: logs.filter((log) => {
					const ts = log.createdAt ? new Date(log.createdAt).getTime() : 0;
					return latestAt - ts <= BATCH_WINDOW_MS;
				});

		const resolvedBatchId =
			batch_id ||
			(typeof batchLogs[0]?.metadata?.batch_id === "string"
				? batchLogs[0].metadata.batch_id
				: "");

		const subjectIds = [
			...new Set(
				batchLogs
					.map((log) => log.subject?.id)
					.filter((id): id is string => typeof id === "string" && id.length > 0),
			),
		];

		const orderedBoxIds = box_ids?.length
			? box_ids.filter((id) => subjectIds.includes(id))
			: subjectIds;

		const boxMap = await fetchHospitalitySettingsChangedBoxes(orderedBoxIds, client_id);
		const actionLabel = deriveActionLabelFromLogs(batchLogs);
		const oldestLog = batchLogs[batchLogs.length - 1];
		const sinceDate = since
			? new Date(since)
			: oldestLog?.createdAt
				? new Date(oldestLog.createdAt)
				: new Date(latestAt - BATCH_WINDOW_MS);

		const payload = buildSettingsChangedAuditPayload({
			batchId: resolvedBatchId || batch_id || "unknown",
			since: sinceDate,
			actionLabel,
			boxIds: orderedBoxIds.length > 0 ? orderedBoxIds : [...boxMap.keys()],
			boxMap,
		});

		if (!payload.timestamp && latestAt > 0) {
			payload.timestamp = formatSettingsChangedTimestamp(new Date(latestAt));
		}

		return context.json<APIResponse<SettingsChangedAuditPayload>>({
			success: true,
			code: 200,
			message: "Settings change audit fetched successfully",
			data: payload,
		});
	},
);
