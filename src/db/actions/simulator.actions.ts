import { prisma } from "@/db";
import type { Prisma, hardware_state, box_connection_status } from "@/db/types";
import { ulid } from "ulid";

export const updateBoxTelemetry = async (
	box_id: string,
	data: Prisma.box_telemetry_latestUpdateInput
) => {
	// Omit box_id from the create data as it's already specified in the relation if needed, or explicitly pass it
	return prisma.box_telemetry_latest.upsert({
		where: { box_id },
		update: data,
		create: {
			id: ulid(),
			box_id,
			...(data as any),
		},
	});
};

export const createSimulatorNotification = async (args: {
	box_id: string;
	category: string;
	type: string;
	title: string;
	description: string;
}) => {
	// Need to resolve the client_id from the box
	const box = await prisma.box.findUnique({
		where: { id: args.box_id },
		select: { client_id: true, box_display_id: true, name: true },
	});

	if (!box) {
		throw new Error("Box not found");
	}

	return prisma.notification.create({
		data: {
			id: ulid(),
			client_id: box.client_id as string,
			box_id: args.box_id,
			box_display_id: box.box_display_id,
			box_name: box.name,
			category: args.category as any,
			type: args.type as any,
			title: args.title,
			description: args.description,
			is_read: false,
			is_dismissed: false,
		},
	});
};
