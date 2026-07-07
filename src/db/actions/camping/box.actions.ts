import { prisma } from "@/db";
import type { box } from "@/db/types";

interface GetCampingBoxesArgs {
	client_id: string;
	vertical_id: string;
	page?: number;
	page_size?: number;
}

export const getCampingBoxes = async (args: GetCampingBoxesArgs) => {
	const { client_id, vertical_id, page = 1, page_size = 40 } = args;

	const skip = (page - 1) * page_size;

	const [boxes, total] = await Promise.all([
		prisma.box.findMany({
			where: {
				client_id,
				vertical_id,
				status: { not: "unassigned" },
			},
			include: {
				telemetry: true,
				lock: true,
			},
			skip,
			take: page_size,
			orderBy: { created_at: "desc" },
		}),
		prisma.box.count({
			where: {
				client_id,
				vertical_id,
				status: { not: "unassigned" },
			},
		}),
	]);

	return { boxes, total };
};

export const getCampingBoxById = async (box_id: string, client_id: string) => {
	return prisma.box.findFirst({
		where: {
			id: box_id,
			client_id,
		},
		include: {
			telemetry: true,
			lock: true,
		},
	});
};
