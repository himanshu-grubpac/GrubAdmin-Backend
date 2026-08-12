import { prisma } from "@/db";
import type { MedicalMobileDashboardData } from "@/types/medical-mobile/dashboard";
import { listHandlerBoxes } from "@/db/actions/medical-mobile/box.actions.ts";

const greetingForHour = (hour: number): string => {
	if (hour < 12) return "Good morning";
	if (hour < 17) return "Good afternoon";
	return "Good evening";
};

export const getHandlerDashboard = async (args: {
	employee_id: string;
	client_id: string;
	first_name?: string | null;
	password?: string | null;
}): Promise<MedicalMobileDashboardData> => {
	const boxes = await listHandlerBoxes(args.employee_id, args.client_id);

	const client = await prisma.client.findUnique({
		where: { id: args.client_id },
		select: { organization_name: true, state: true, country: true },
	});

	const connectedBox = await prisma.box.findFirst({
		where: {
			client_id: args.client_id,
			medical_connection_employee_id: args.employee_id,
		},
		include: { telemetry: true },
		orderBy: { updated_at: "desc" },
	});

	const locationParts = [client?.organization_name, client?.state, client?.country].filter(Boolean);
	const hour = new Date().getHours();
	const name = args.first_name?.trim() || "there";

	return {
		is_password_set: !!args.password,
		has_boxes: boxes.length > 0,
		greeting: `${greetingForHour(hour)}, ${name}`,
		location_name: locationParts.length > 0 ? locationParts.join(", ") : null,
		outside_temp_c: connectedBox?.telemetry?.ext_temp ?? null,
		boxes,
	};
};
