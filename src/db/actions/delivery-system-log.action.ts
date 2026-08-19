import { getSystemLogs } from "@/db/actions/system-log.action.ts";
import { DEFAULT_IP_ADDRESS } from "@/configs/constants.ts";
import { LOG_CONFIG } from "@/configs/log.config.ts";
import { GrubpacLog } from "@/db/mongo-schema";
import {
	DELIVERY_LOG_DEFAULT_PAGE_SIZE,
	DELIVERY_LOG_EXPORT_MAX_ROWS,
} from "@/modules/delivery/configs/delivery-log-limits.ts";
import { logger } from "@/utils/logger.ts";

type GetDeliverySystemLogsArgs = Parameters<typeof getSystemLogs>[0];

export const resolveDeliveryLogPageSize = (pageSize?: number): number => {
	if (!pageSize || pageSize <= 0) return DELIVERY_LOG_DEFAULT_PAGE_SIZE;
	return Math.min(pageSize, DELIVERY_LOG_EXPORT_MAX_ROWS);
};

/** Delivery log fetch — always paginated; default 50, max 1000 (D-BE-07). */
export const getDeliverySystemLogs = async (args: GetDeliverySystemLogsArgs) => {
	const page = args.page && args.page > 0 ? args.page : 1;
	const page_size = resolveDeliveryLogPageSize(args.page_size);

	return getSystemLogs({
		...args,
		page,
		page_size,
	});
};

export interface DeliveryGrubLockStatusLogParams {
	client_id: string;
	vertical_id?: string;
	box_ids: string[];
	actor: {
		id: string;
		name: string;
		role?: string;
		table?: string;
	};
	metadata: {
		action: "lock";
		recipient?: string;
	};
}

const isGrubLockStatusLoggingEnabled = (): boolean => {
	if (!LOG_CONFIG.enabled) return false;
	const categoryConfig = LOG_CONFIG.categories.GrubLock;
	if (!categoryConfig?.enabled) return false;
	return categoryConfig.types?.Status !== false;
};

const buildGrubLockLockDescription = (
	actor: DeliveryGrubLockStatusLogParams["actor"],
	boxId: string,
	recipient?: string,
): string => {
	const actorLabel = `[${actor.name}, ${actor.id}]`;
	const subjectLabel = `[${boxId}, ${boxId}]`;
	return `${actorLabel} locked ${subjectLabel} - [${recipient || "Recepient name, Contact info"}]`;
};

/** Batch GrubLock lock audit logs — single Mongo insertMany (D-BE-08). */
export const createDeliveryGrubLockStatusLogs = async (
	params: DeliveryGrubLockStatusLogParams,
): Promise<void> => {
	const { client_id, vertical_id, box_ids, actor, metadata } = params;
	if (!box_ids.length || !isGrubLockStatusLoggingEnabled()) return;
	if (!actor.id || !actor.name) {
		logger.error("Missing actor data for GrubLock batch logging");
		return;
	}

	const normalizedRole =
		actor.table === "client" && actor.role === "admin" ? "admin" : actor.role;

	const documents = box_ids.map((boxId) => ({
		category: "GrubLock",
		type: "Status",
		description: buildGrubLockLockDescription(actor, boxId, metadata.recipient),
		actor: {
			id: actor.id,
			name: actor.name,
			role: normalizedRole,
			table: actor.table,
			ip: DEFAULT_IP_ADDRESS,
		},
		client_id,
		vertical_id,
		subject: { id: boxId, name: boxId, type: "box" },
		metadata,
	}));

	try {
		await GrubpacLog.insertMany(documents);
	} catch (error) {
		logger.error(`Failed to create delivery GrubLock status logs: ${error}`);
	}
};
