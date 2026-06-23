import { medicalAuthGuard } from "@/middlewares/auth";
import { createHandlers } from "@/utils/hono-factory";
import { getBoxesRequestQueryValidator } from "medical/validators/box.validators";
import type { APIResponse } from "@/types/api";
import { getMedicalBoxes } from "@/db/actions/medical/box.actions";
import { calculatePagination } from "@/utils/pagination.ts";
import { BoxConfig } from "@/db/mongo-schema";

export const getGrubpacHandler = createHandlers(
	medicalAuthGuard(),
	getBoxesRequestQueryValidator,
	async (context) => {
		const { client_id } = context.var;
		const query = context.req.valid("query") as {
			page?: number;
			limit?: number;
			query?: string;
			status?: "active" | "suspended";
			department_id?: string | null;
			employee_id?: string | null;
			group_by?: "lock_status" | "departments" | "power_status";
			group_by_selected_table?: string;
			connection_status?: string;
			power_status?: string;
			health_status?: string;
		};

		const fetchAll = !!query.group_by || (query.limit === undefined && query.page === undefined);

		const boxesData = await getMedicalBoxes({
			page: fetchAll ? undefined : query.page,
			limit: fetchAll ? undefined : query.limit,
			query: query.query,
			status: query.status,
			department_id: query.department_id,
			employee_id: query.employee_id,
			client_id,
			connection_status: query.connection_status,
			power_status: query.power_status,
			health_status: query.health_status,
		});

		if (query.group_by === "power_status") {
			const groups: Record<string, { boxes: unknown[]; count: number }> = {};
			for (const box of boxesData.boxes) {
				const b = box as { telemetry?: { power_status?: string | null } };
				const key = b.telemetry?.power_status === "on" ? "on" : b.telemetry?.power_status === "off" ? "off" : "unknown";
				if (query.group_by_selected_table && query.group_by_selected_table !== key) continue;
				if (!groups[key]) groups[key] = { boxes: [], count: 0 };
				groups[key].boxes.push(box);
				groups[key].count += 1;
			}
			return context.json<APIResponse<{ groups: typeof groups }>>(
				{ success: true, code: 200, data: { groups } },
				{ status: 200 },
			);
		}

		if (query.group_by === "departments") {
			const groups: Record<string, { boxes: unknown[]; count: number; department_name?: string }> = {};
			for (const box of boxesData.boxes) {
				const b = box as {
					medical_department_boxes?: Array<{ department?: { id: string; name: string } | null }>;
				};
				const dept = b.medical_department_boxes?.[0]?.department;
				const key = dept?.id ?? "unassigned";
				if (query.group_by_selected_table && query.group_by_selected_table !== key) continue;
				if (!groups[key]) {
					groups[key] = {
						boxes: [],
						count: 0,
						department_name: dept?.name ?? "Unassigned",
					};
				}
				groups[key].boxes.push(box);
				groups[key].count += 1;
			}
			return context.json<APIResponse<{ groups: typeof groups }>>(
				{ success: true, code: 200, data: { groups } },
				{ status: 200 },
			);
		}

		if (query.group_by === "lock_status") {
			const configs = await BoxConfig.find({
				box_id: { $in: boxesData.boxes.map((b) => b.id) },
			});
			const lockMap = new Map(configs.map((c) => [c.box_id, c.grublock || "unlocked"]));
			const groups: Record<string, { boxes: unknown[]; count: number }> = {};
			for (const box of boxesData.boxes) {
				const key = lockMap.get(box.id) || "unlocked";
				if (query.group_by_selected_table && query.group_by_selected_table !== key) continue;
				if (!groups[key]) groups[key] = { boxes: [], count: 0 };
				groups[key].boxes.push(box);
				groups[key].count += 1;
			}
			return context.json<APIResponse<{ groups: typeof groups }>>(
				{ success: true, code: 200, data: { groups } },
				{ status: 200 },
			);
		}

		const finalPage = query.page ?? 1;
		const finalLimit = query.limit;

		return context.json<APIResponse<typeof boxesData>>(
			{
				success: true,
				code: 200,
				data: boxesData,
				pagination: calculatePagination(finalPage, finalLimit ?? boxesData.count, boxesData.count),
			},
			{ status: 200 },
		);
	},
);
