import { prisma } from "@/db";
import type { hospitality_outbox_kind, Prisma } from "@/db/types";
import { logHospitalityScoped } from "hospitality/utils/hospitality-logger";

export type HospitalityOutboxKind = hospitality_outbox_kind;

export interface WriteHospitalityOutboxEventArgs {
	client_id: string;
	kind: HospitalityOutboxKind;
	payload: Prisma.InputJsonValue;
}

/**
 * Persist a dual-write outbox row when MySQL succeeded but Mongo notification/log
 * write failed (or when async replay is preferred). Worker replay is Phase 2 stub only.
 */
export async function writeHospitalityOutboxEvent(
	args: WriteHospitalityOutboxEventArgs,
): Promise<string> {
	const row = await prisma.hospitality_outbox_event.create({
		data: {
			client_id: args.client_id,
			kind: args.kind,
			payload: args.payload,
			status: "pending",
		},
		select: { id: true },
	});
	return row.id;
}

export interface ReplayHospitalityOutboxResult {
	processed: number;
	failed: number;
	skipped: number;
}

/**
 * Replay stub — selects pending rows, marks them processing, then leaves them pending
 * until a Phase 3 worker implements Mongo dual-write handlers.
 */
export async function replayHospitalityOutboxEvents(options?: {
	limit?: number;
}): Promise<ReplayHospitalityOutboxResult> {
	const limit = Math.min(options?.limit ?? 50, 200);
	const pending = await prisma.hospitality_outbox_event.findMany({
		where: { status: "pending" },
		orderBy: { created_at: "asc" },
		take: limit,
		select: { id: true, kind: true, client_id: true },
	});

	if (pending.length === 0) {
		return { processed: 0, failed: 0, skipped: 0 };
	}

	let processed = 0;
	let failed = 0;

	for (const event of pending) {
		try {
			await prisma.hospitality_outbox_event.update({
				where: { id: event.id },
				data: {
					status: "processing",
					attempts: { increment: 1 },
				},
			});

			logHospitalityScoped("info", "hospitality_outbox_replay_stub", {
				client_id: event.client_id,
			}, {
				kind: event.kind,
				event_id: event.id,
			});

			await prisma.hospitality_outbox_event.update({
				where: { id: event.id },
				data: {
					status: "pending",
					last_error: "Replay worker not implemented — event left pending for Phase 3 worker",
				},
			});
			processed += 1;
		} catch (error) {
			failed += 1;
			await prisma.hospitality_outbox_event
				.update({
					where: { id: event.id },
					data: {
						status: "failed",
						last_error: String(error),
						attempts: { increment: 1 },
					},
				})
				.catch(() => undefined);
		}
	}

	return { processed, failed, skipped: 0 };
}
