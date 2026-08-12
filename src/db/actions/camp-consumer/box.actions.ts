import { prisma } from "@/db";
import { actionGrubpac, updateBoxLockStatus } from "@/db/actions/box.actions.ts";
import { CampingConsumerOtp } from "@/db/mongo-schema";
import type { hardware_state } from "@/db/types";
import { APIError } from "@/types/error";
import type {
	LockAction,
	MobileBoxConnectionResult,
	MobileBoxDetails,
	MobileBoxSettingsPatch,
	MobileBoxSettingsUpdateResult,
	MobileBoxSummary,
} from "@/types/mobile-box";
import {
	boolToHardwareState,
	mergeSettingsPatch,
	toMobileBoxDetails,
	toMobileBoxSettings,
	toMobileBoxSummary,
	type BoxWithRelations,
} from "@/db/actions/camp-consumer/box.mapper.ts";
import {
	BOX_POWERED_OFF_CONNECT_MESSAGE,
	isBoxPoweredOff,
} from "@/utils/box-power.ts";
import {
	compareCampingConsumerOtp,
	deleteSavedCampingConsumerOtp,
	getSavedCampingConsumerOtp,
} from "@/db/actions/camping-consumer-otp.actions.ts";

const MAX_LOCK_OTP_ATTEMPTS = 3;

const boxInclude = {
	telemetry: true,
	lock: true,
} as const;

const boxWhereForConsumer = (box_id: string, client_id?: string | null) => ({
	id: box_id,
	status: { not: "suspended" as const },
	...(client_id ? { client_id } : {}),
});

export const resolveConsumerBoxById = async (args: {
	box_id: string;
	consumer_id: string;
	client_id?: string | null;
}) => {
	const assignment = await prisma.vertical_camping_consumer_box.findFirst({
		where: {
			consumer_id: args.consumer_id,
			status: "active",
			box: boxWhereForConsumer(args.box_id, args.client_id),
		},
		include: {
			box: {
				include: boxInclude,
			},
		},
	});

	if (!assignment) {
		throw new APIError(undefined, "camping.box.NOT_FOUND", undefined, 404);
	}

	return { box: assignment.box, assignment };
};

export const listConsumerBoxes = async (
	consumer_id: string,
	client_id?: string | null,
): Promise<MobileBoxSummary[]> => {
	const assignments = await prisma.vertical_camping_consumer_box.findMany({
		where: {
			consumer_id,
			status: "active",
			box: {
				status: { not: "suspended" },
				...(client_id ? { client_id } : {}),
			},
		},
		include: {
			box: {
				include: {
					telemetry: true,
					lock: true,
				},
			},
		},
	});

	return assignments.map((assignment) =>
		toMobileBoxSummary(assignment.box as BoxWithRelations),
	);
};

export const registerConsumerBox = async (args: {
	scanned_code: string;
	consumer_id: string;
	client_id?: string | null;
}): Promise<MobileBoxSummary> => {
	const scanned_code = args.scanned_code.trim();
	if (!scanned_code) {
		throw new APIError("Scanned code is required", undefined, undefined, 400);
	}

	return prisma.$transaction(async (tx) => {
		const box = await tx.box.findFirst({
			where: {
				box_display_id: scanned_code,
				...(args.client_id ? { client_id: args.client_id } : {}),
			},
			include: {
				telemetry: true,
				lock: true,
			},
		});

		if (!box || box.status === "suspended") {
			throw new APIError(undefined, "camping.box.NOT_FOUND", undefined, 404);
		}

		const existingActive = await tx.vertical_camping_consumer_box.findFirst({
			where: {
				box_id: box.id,
				status: "active",
				NOT: { consumer_id: args.consumer_id },
			},
		});

		if (existingActive) {
			throw new APIError("Box is already registered to another consumer", undefined, undefined, 409);
		}

		const ownAssignment = await tx.vertical_camping_consumer_box.findFirst({
			where: {
				box_id: box.id,
				consumer_id: args.consumer_id,
			},
		});

		if (ownAssignment?.status === "active") {
			throw new APIError("Box is already registered to this account", undefined, undefined, 409);
		}

		if (ownAssignment) {
			await tx.vertical_camping_consumer_box.update({
				where: { id: ownAssignment.id },
				data: { status: "active" },
			});
		} else {
			await tx.vertical_camping_consumer_box.create({
				data: {
					box_id: box.id,
					consumer_id: args.consumer_id,
					status: "active",
				},
			});
		}

		if (!args.client_id && box.client_id) {
			await tx.vertical_camping_consumer.update({
				where: { id: args.consumer_id },
				data: { client_id: box.client_id },
			});
		}

		return toMobileBoxSummary(box as BoxWithRelations);
	});
};

export const getConsumerBoxDetails = async (args: {
	box_id: string;
	consumer_id: string;
	client_id?: string | null;
}): Promise<MobileBoxDetails> => {
	const { box } = await resolveConsumerBoxById(args);
	return toMobileBoxDetails(box as BoxWithRelations);
};

export const unlinkConsumerBox = async (args: {
	box_id: string;
	consumer_id: string;
	client_id?: string | null;
}): Promise<void> => {
	const { box } = await resolveConsumerBoxById(args);

	await prisma.$transaction(async (tx) => {
		const updated = await tx.vertical_camping_consumer_box.updateMany({
			where: {
				box_id: box.id,
				consumer_id: args.consumer_id,
				status: "active",
			},
			data: { status: "inactive" },
		});

		if (updated.count === 0) {
			throw new APIError(undefined, "camping.box.NOT_FOUND", undefined, 404);
		}

		await tx.box_telemetry_latest.upsert({
			where: { box_id: box.id },
			create: {
				box_id: box.id,
				connection_status: "disconnected",
			},
			update: {
				connection_status: "disconnected",
			},
		});
	});
};

const mapSettingsPatchToGrubpac = (patch: MobileBoxSettingsPatch) => {
	const payload: {
		dual_zone_status?: hardware_state;
		zone1_temp?: number;
		zone2_temp?: number;
		advert_screen_status?: hardware_state;
		ioniser_status?: hardware_state;
		light_status?: hardware_state;
	} = {};

	if (patch.is_dual_zone !== undefined) {
		payload.dual_zone_status = boolToHardwareState(patch.is_dual_zone);
	}
	if (patch.zone_1_temp !== undefined) {
		payload.zone1_temp = patch.zone_1_temp;
	}
	if (patch.zone_2_temp !== undefined) {
		payload.zone2_temp = patch.zone_2_temp;
	}
	if (patch.advert_display_enabled !== undefined) {
		payload.advert_screen_status = boolToHardwareState(patch.advert_display_enabled);
	}
	if (patch.ioniser_enabled !== undefined) {
		payload.ioniser_status = boolToHardwareState(patch.ioniser_enabled);
	}
	if (patch.light_enabled !== undefined) {
		payload.light_status = boolToHardwareState(patch.light_enabled);
	}

	return payload;
};

export const updateConsumerBoxSettings = async (args: {
	box_id: string;
	client_id?: string | null;
	consumer_id: string;
	patch: MobileBoxSettingsPatch;
}): Promise<MobileBoxSettingsUpdateResult> => {
	const hasPatchField = Object.values(args.patch).some((v) => v !== undefined);
	if (!hasPatchField) {
		throw new APIError("At least one setting field is required", undefined, undefined, 400);
	}

	const { box } = await resolveConsumerBoxById(args);
	const grubpacPayload = mapSettingsPatchToGrubpac(args.patch);

	if (Object.keys(grubpacPayload).length > 0 && args.client_id) {
		await actionGrubpac({
			ids: [box.id],
			client_id: args.client_id,
			...grubpacPayload,
		});
	}

	const updated = await prisma.box.findFirst({
		where: { id: box.id },
		include: {
			telemetry: true,
			lock: true,
		},
	});

	if (!updated) {
		throw new APIError(undefined, "camping.box.NOT_FOUND", undefined, 404);
	}

	const currentSettings = toMobileBoxSettings(updated.telemetry);
	const settings = mergeSettingsPatch(currentSettings, {
		is_dual_zone: args.patch.is_dual_zone,
		zone_1_temp: args.patch.zone_1_temp,
		zone_2_temp: args.patch.zone_2_temp,
		advert_display_enabled: args.patch.advert_display_enabled,
		ioniser_enabled: args.patch.ioniser_enabled,
		light_enabled: args.patch.light_enabled,
	});

	return {
		id: updated.id,
		box_display_id: updated.box_display_id,
		settings,
	};
};

const setBoxConnectionState = async (args: {
	box_id: string;
	client_id?: string | null;
	connection_status: "connected" | "disconnected";
}) => {
	await prisma.$transaction(async (tx) => {
		const updated = await tx.box.updateMany({
			where: {
				id: args.box_id,
				NOT: { status: "suspended" },
				...(args.client_id ? { client_id: args.client_id } : {}),
			},
			data: {},
		});

		if (updated.count === 0) {
			throw new APIError(undefined, "camping.box.NOT_FOUND", undefined, 404);
		}

		await tx.box_telemetry_latest.upsert({
			where: { box_id: args.box_id },
			create: {
				box_id: args.box_id,
				connection_status: args.connection_status,
			},
			update: {
				connection_status: args.connection_status,
			},
		});
	});
};

export const connectConsumerBox = async (args: {
	box_id: string;
	client_id?: string | null;
	consumer_id: string;
}): Promise<MobileBoxConnectionResult> => {
	const { box } = await resolveConsumerBoxById(args);

	if (isBoxPoweredOff(box.telemetry?.power_status)) {
		throw new APIError(BOX_POWERED_OFF_CONNECT_MESSAGE, undefined, undefined, 400);
	}

	if (box.telemetry?.connection_status === "connected") {
		return {
			id: box.id,
			box_display_id: box.box_display_id,
			is_connected: true,
		};
	}

	await setBoxConnectionState({
		box_id: box.id,
		client_id: args.client_id,
		connection_status: "connected",
	});

	return {
		id: box.id,
		box_display_id: box.box_display_id,
		is_connected: true,
	};
};

export const disconnectConsumerBox = async (args: {
	box_id: string;
	client_id?: string | null;
	consumer_id: string;
}): Promise<MobileBoxConnectionResult> => {
	const { box } = await resolveConsumerBoxById(args);

	if (box.telemetry?.connection_status !== "connected") {
		throw new APIError("Box is not connected", undefined, undefined, 403);
	}

	await setBoxConnectionState({
		box_id: box.id,
		client_id: args.client_id,
		connection_status: "disconnected",
	});

	return {
		id: box.id,
		box_display_id: box.box_display_id,
		is_connected: false,
	};
};

export const verifyConsumerLockOtp = async (args: {
	box_id: string;
	client_id?: string | null;
	consumer_id: string;
	consumer_email: string;
	consumer_name: string;
	code: string;
	action: LockAction;
}): Promise<void> => {
	if (args.action !== "unlock") {
		throw new APIError("Lock action requires PATCH /boxes/:box_id/lock", undefined, undefined, 400);
	}

	const { box } = await resolveConsumerBoxById(args);
	const savedOtp = await getSavedCampingConsumerOtp(args.consumer_email);

	if (!savedOtp) {
		throw new APIError("OTP expired or invalid", undefined, undefined, 400);
	}

	if (savedOtp.for_what !== "unlock_box") {
		throw new APIError("Invalid OTP purpose", undefined, undefined, 400);
	}

	const metadata = savedOtp.metadata as {
		ids?: string[];
		box_display_id?: string;
		action?: LockAction;
	} | null;

	const metadataIds = metadata?.ids;

	if (metadataIds && !metadataIds.includes(box.id)) {
		throw new APIError("Invalid OTP session for this box", undefined, undefined, 403);
	}

	const isValidOtp = await compareCampingConsumerOtp(args.code, savedOtp.otp);

	if (!isValidOtp) {
		const attempts = (savedOtp.failed_attempts ?? 0) + 1;

		if (attempts >= MAX_LOCK_OTP_ATTEMPTS) {
			await deleteSavedCampingConsumerOtp(args.consumer_email);
			throw new APIError("OTP expired or invalid", undefined, undefined, 400);
		}

		await CampingConsumerOtp.updateOne({ _id: savedOtp._id }, { failed_attempts: attempts });

		throw new APIError("Invalid OTP", undefined, undefined, 400);
	}

	await updateBoxLockStatus({
		ids: [box.id],
		lock_status: "unlocked",
		user: {
			id: args.consumer_id,
			email: args.consumer_email,
			name: args.consumer_name,
		},
		client_id: args.client_id ?? box.client_id!,
	});

	await deleteSavedCampingConsumerOtp(args.consumer_email);
};

export const resolveConsumerClientId = async (consumer_id: string): Promise<string | null> => {
	const consumer = await prisma.vertical_camping_consumer.findUnique({
		where: { id: consumer_id },
		select: { client_id: true },
	});

	if (consumer?.client_id) {
		return consumer.client_id;
	}

	const assignment = await prisma.vertical_camping_consumer_box.findFirst({
		where: { consumer_id, status: "active" },
		include: { box: { select: { client_id: true } } },
	});

	return assignment?.box.client_id ?? null;
};
