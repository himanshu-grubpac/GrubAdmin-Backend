import { prisma } from "@/db";
import type { CampingMobileDashboardData } from "@/types/camping-mobile/dashboard";
import { listConsumerBoxes } from "@/db/actions/camp-consumer/box.actions.ts";

const greetingForHour = (hour: number): string => {
	if (hour < 12) return "Good morning";
	if (hour < 17) return "Good afternoon";
	return "Good evening";
};

export const getConsumerDashboard = async (args: {
	consumer_id: string;
	client_id?: string | null;
	full_name?: string | null;
	password?: string | null;
}): Promise<CampingMobileDashboardData> => {
	const boxes = await listConsumerBoxes(args.consumer_id, args.client_id);

	let client_id = args.client_id;
	if (!client_id && boxes.length > 0) {
		const firstBoxId = boxes[0]!.id;
		const firstBox = await prisma.box.findUnique({
			where: { id: firstBoxId },
			select: { client_id: true },
		});
		client_id = firstBox?.client_id ?? null;
	}

	const client = client_id
		? await prisma.client.findUnique({
				where: { id: client_id },
				select: { organization_name: true, state: true, country: true },
			})
		: null;

	const connectedBox = await prisma.box.findFirst({
		where: {
			...(client_id ? { client_id } : {}),
			telemetry: { connection_status: "connected" },
			camping_consumer_boxes: {
				some: {
					consumer_id: args.consumer_id,
					status: "active",
				},
			},
		},
		include: { telemetry: true },
		orderBy: { updated_at: "desc" },
	});

	const locationParts = [client?.organization_name, client?.state, client?.country].filter(Boolean);
	const hour = new Date().getHours();
	const name = args.full_name?.trim() || "there";

	return {
		is_password_set: !!args.password,
		has_boxes: boxes.length > 0,
		greeting: `${greetingForHour(hour)}, ${name}`,
		location_name: locationParts.length > 0 ? locationParts.join(", ") : null,
		outside_temp_c: connectedBox?.telemetry?.ext_temp ?? null,
		boxes,
	};
};
