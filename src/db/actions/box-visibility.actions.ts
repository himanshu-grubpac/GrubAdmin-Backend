import { prisma } from "@/db";
import type { restaurant_box_status } from "@/db/types";

interface BoxWithRelations {
	id: string;
	name: string | null;
	box_display_id: string;
	status: string;
	client_id: string | null;
	[key: string]: any;
}

/**
 * Get boxes directly assigned to a restaurant (owned by the same client).
 * A box is "owned" by the restaurant's client if box.client_id === restaurant.client_id.
 */
export const getRestaurantOwnedBoxes = async (
	restaurantId: string,
	clientId: string,
): Promise<BoxWithRelations[]> => {
	const restaurantBoxes = await prisma.restaurant_box.findMany({
		where: {
			restaurant_id: restaurantId,
			status: "shared",
			box: {
				client_id: clientId,
			},
		},
		include: {
			box: {
				include: {
					telemetry: true,
				},
			},
		},
	});

	return restaurantBoxes.map((rb: any) => rb.box).filter(Boolean);
};

/**
 * Get boxes shared with a restaurant but owned by another client.
 * A box is "shared" if box.client_id !== restaurant.client_id.
 */
export const getRestaurantSharedBoxes = async (
	restaurantId: string,
	clientId: string,
): Promise<BoxWithRelations[]> => {
	const restaurantBoxes = await prisma.restaurant_box.findMany({
		where: {
			restaurant_id: restaurantId,
			status: "shared",
			NOT: {
				box: {
					client_id: clientId,
				},
			},
		},
		include: {
			box: {
				include: {
					telemetry: true,
				},
			},
		},
	});

	return restaurantBoxes.map((rb: any) => rb.box).filter(Boolean);
};

/**
 * Get all boxes accessible to a restaurant (owned + shared), deduplicated by box ID.
 */
export const getRestaurantAccessibleBoxes = async (
	restaurantId: string,
	clientId: string,
): Promise<BoxWithRelations[]> => {
	const restaurantBoxes = await prisma.restaurant_box.findMany({
		where: {
			restaurant_id: restaurantId,
			status: "shared",
		},
		include: {
			box: {
				include: {
					telemetry: true,
				},
			},
		},
	});

	const boxMap = new Map<string, BoxWithRelations>();
	for (const rb of restaurantBoxes) {
		if (rb.box) {
			boxMap.set(rb.box.id, rb.box as BoxWithRelations);
		}
	}

	return Array.from(boxMap.values());
};

/**
 * Get employee-level box assignments (directly shared with the employee).
 */
export const getEmployeeDirectBoxes = async (employeeId: string): Promise<BoxWithRelations[]> => {
	const assignments = await prisma.vertical_delivery_employee_box.findMany({
		where: {
			employee_id: employeeId,
			status: "shared",
		},
		include: {
			box: {
				include: {
					telemetry: true,
				},
			},
		},
	});

	return assignments.map((a: any) => a.box).filter(Boolean);
};

/**
 * Get blocked boxes for an employee.
 */
export const getEmployeeBlockedBoxes = async (employeeId: string): Promise<BoxWithRelations[]> => {
	const assignments = await prisma.vertical_delivery_employee_box.findMany({
		where: {
			employee_id: employeeId,
			status: "blocked",
		},
		include: {
			box: {
				include: {
					telemetry: true,
				},
			},
		},
	});

	return assignments.map((a: any) => a.box).filter(Boolean);
};

/**
 * Given a restaurant ID and client ID, return:
 * - boxes: owned boxes (direct)
 * - all_boxes: owned + shared (accessible)
 * - boxes_count: length of boxes
 * - all_boxes_count: length of all_boxes
 */
export const getRestaurantBoxVisibility = async (
	restaurantId: string,
	clientId: string,
): Promise<{
	boxes: BoxWithRelations[];
	all_boxes: BoxWithRelations[];
	boxes_count: number;
	all_boxes_count: number;
}> => {
	const [owned, shared] = await Promise.all([
		getRestaurantOwnedBoxes(restaurantId, clientId),
		getRestaurantSharedBoxes(restaurantId, clientId),
	]);

	const boxes = owned;
	const allBoxes = [...owned];

	const seenIds = new Set(owned.map((b) => b.id));
	for (const b of shared) {
		if (!seenIds.has(b.id)) {
			allBoxes.push(b);
			seenIds.add(b.id);
		}
	}

	return {
		boxes,
		all_boxes: allBoxes,
		boxes_count: boxes.length,
		all_boxes_count: allBoxes.length,
	};
};

/**
 * Flatten a box record for API response (strip telemetry internals, add telemetry fields at top level).
 */
export const flattenBox = (box: any): any => {
	if (!box) return null;
	const { telemetry, ...boxData } = box;
	const { id: _tid, box_id: _tbid, updated_at: _tua, ...telemetryData } = (telemetry || {}) as any;
	return { ...boxData, ...telemetryData };
};
