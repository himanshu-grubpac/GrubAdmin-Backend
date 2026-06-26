import { medicalAuthGuard } from "@/middlewares/auth";
import { createHandlers } from "@/utils/hono-factory";
import { updateGrubpacRequestBodyValidator } from "medical/validators/box.validators";
import type { APIResponse } from "@/types/api";
import { prisma } from "@/db";
import { updateMedicalGrubpac } from "@/db/actions/medical/box.actions";
import { loggerService } from "@/services/system-log";

export const updateGrubpacHandler = createHandlers(
	medicalAuthGuard(["admin"]),
	updateGrubpacRequestBodyValidator,
	async (context) => {
		const { client_id, user_id, user, type } = context.var;
		const { id, name, department_id } = context.req.valid("json");

		const previousBox = await prisma.box.findUnique({
			where: { id, client_id },
			include: {
				medical_department_boxes: {
					include: { department: { select: { id: true, name: true } } },
				},
			},
		});

		if (!previousBox) {
			return context.json<APIResponse>({
				success: false,
				code: 404,
				error: "Box not found",
			}, 404);
		}

		const box = await updateMedicalGrubpac({ id, client_id, name, department_id });

		const changes: any[] = [];
		const prevDept = previousBox.medical_department_boxes[0]?.department ?? null;
		const newDept = (box as any)?.medical_department_boxes?.[0]?.department ?? null;

		if (name !== undefined && name !== previousBox.name) {
			changes.push({ field: "name", old_value: previousBox.name, new_value: name });
		}

		const prevDeptId = prevDept?.id ?? null;
		const newDeptId = newDept?.id ?? null;
		if (department_id !== undefined && prevDeptId !== newDeptId) {
			changes.push({
				field: "department",
				old_value: prevDept?.name ?? null,
				new_value: newDept?.name ?? null,
			});
		}

		if (changes.length > 0) {
			const userObj = user as any;
			const actorName = type === "admin"
				? userObj.name
				: `${userObj.first_name} ${userObj.last_name || ""}`.trim();

			await loggerService.log({
				category: "GrubPac",
				type: "Updation",
				actor: {
					id: user_id,
					name: actorName,
					role: type,
					table: type === "admin" ? "client" : "vertical_medical_employee",
				},
				client_id,
				subject: {
					id: box!.id,
					name: box!.name || "Box",
					type: "box",
				},
				metadata: { changes },
			});
		}

		return context.json<APIResponse<any>>({
			success: true,
			code: 200,
			message: "GrubPac updated successfully!",
			data: box,
		});
	},
);
