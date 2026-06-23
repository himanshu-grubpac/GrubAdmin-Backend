import { prisma } from "@/db";
import type { Prisma, box_status, box_connection_status, hardware_state, box_health_status } from "@/db/types";

interface GetVerticalHospitalityBoxesArgs {
	client_id: string;
	status?: box_status;
	page_number?: number;
	page_size?: number;
	fetchAll?: boolean;
	connection_status?: string;
	power_status?: string;
	health_status?: string;
	ioniser_status?: string;
	dual_zone_status?: string;
	zone1_min?: number;
	zone1_max?: number;
	zone2_min?: number;
	zone2_max?: number;
	ext_min?: number;
	ext_max?: number;
	query?: string;
}

export const getVerticalHospitalityBoxes = async (args: GetVerticalHospitalityBoxesArgs) => {
	const {
		client_id,
		status,
		page_size,
		page_number,
		fetchAll,
		connection_status,
		power_status,
		health_status,
		ioniser_status,
		dual_zone_status,
		zone1_min,
		zone1_max,
		zone2_min,
		zone2_max,
		ext_min,
		ext_max,
		query,
	} = args;

	const telemetryFilter: any = {};
	if (connection_status) telemetryFilter.connection_status = connection_status as box_connection_status;
	if (power_status) telemetryFilter.power_status = power_status as hardware_state;
	if (health_status) telemetryFilter.health_status = health_status as box_health_status;
	if (ioniser_status) telemetryFilter.ioniser_status = ioniser_status as hardware_state;
	if (dual_zone_status) telemetryFilter.dual_zone_status = dual_zone_status as hardware_state;

	if (zone1_min !== undefined || zone1_max !== undefined) {
		telemetryFilter.zone1_temp = { gte: zone1_min, lte: zone1_max };
	}
	if (zone2_min !== undefined || zone2_max !== undefined) {
		telemetryFilter.zone2_temp = { gte: zone2_min, lte: zone2_max };
	}
	if (ext_min !== undefined || ext_max !== undefined) {
		telemetryFilter.ext_temp = { gte: ext_min, lte: ext_max };
	}

	const where: Prisma.boxWhereInput = {
		client_id: client_id,
		status: status || { not: "suspended" },
		...(Object.keys(telemetryFilter).length > 0 ? { telemetry: { is: telemetryFilter } } : {}),
		OR: query
			? [
					{ name: { contains: query } },
					{ box_display_id: { contains: query } },
			  ]
			: undefined,
	};

	const count = await prisma.box.count({ where });

	const take = fetchAll ? undefined : page_size || 40;
	const skip = fetchAll ? undefined : page_number && page_size ? (page_number - 1) * page_size : undefined;

	const boxes = await prisma.box.findMany({
		where,
		include: {
			telemetry: true,
		},
		skip,
		take,
		orderBy: {
			created_at: "desc",
		},
	});

	return { boxes, count };
};
