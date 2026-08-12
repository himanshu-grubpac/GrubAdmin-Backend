import { prisma } from "@/db";
import type { MedicalOwnerDashboardData } from "@/types/medical-mobile/owner-dashboard";
import { listOwnerDashboardBoxCards } from "@/db/actions/medical-mobile/owner-box.actions.ts";

const greetingForHour = (hour: number): string => {
	if (hour < 12) return "Good morning";
	if (hour < 17) return "Good afternoon";
	return "Good evening";
};

export const getOwnerDashboard = async (args: {
	client_id: string;
	owner_name?: string | null;
	password?: string | null;
}): Promise<MedicalOwnerDashboardData> => {
	const boxes = await listOwnerDashboardBoxCards(args.client_id);

	const client = await prisma.client.findUnique({
		where: { id: args.client_id },
		select: { organization_name: true, state: true, country: true, name: true },
	});

	const connectedBox = await prisma.box.findFirst({
		where: {
			client_id: args.client_id,
			telemetry: { connection_status: "connected" },
			medical_employee_boxes: {
				some: {
					employee_id: null,
					status: "shared",
				},
			},
		},
		include: { telemetry: true },
		orderBy: { updated_at: "desc" },
	});

	const locationParts = [client?.organization_name, client?.state, client?.country].filter(Boolean);
	const hour = new Date().getHours();
	const name = args.owner_name?.trim() || client?.name?.trim() || "there";

	return {
		is_password_set: !!args.password,
		has_boxes: boxes.length > 0,
		greeting: `${greetingForHour(hour)}, ${name}`,
		location: locationParts.length > 0 ? locationParts.join(", ") : null,
		outside_temp_c: connectedBox?.telemetry?.ext_temp ?? null,
		boxes,
	};
};
