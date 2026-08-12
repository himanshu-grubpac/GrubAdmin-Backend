import { updateMedicalBoxLockStatus } from "@/db/actions/medical/box.actions.ts";
import { createNotification } from "@/db/actions/notification.actions.ts";

export const emergencyUnlockMedicalBoxes = async (args: {
	ids: string[];
	client_id: string;
	vertical_id: string;
	user: {
		id: string;
		email: string;
		name: string;
		role: string;
		type?: string;
	};
	reason?: string;
}) => {
	const result = await updateMedicalBoxLockStatus({
		ids: args.ids,
		lock_status: "unlocked",
		user: {
			id: args.user.id,
			email: args.user.email,
			name: args.user.name,
			role: args.user.role,
			type: args.user.type,
			client_id: args.client_id,
			vertical_id: args.vertical_id,
		},
		client_id: args.client_id,
		reason: args.reason,
	});

	try {
		for (const boxId of args.ids) {
			await createNotification({
				client_id: args.client_id,
				vertical_id: args.vertical_id,
				box_id: boxId,
				type: "warning",
				title: "Emergency Unlock",
				description: `Box ${boxId} has been emergency unlocked${args.reason ? ` (Reason: ${args.reason})` : ""}`,
			});
		}
	} catch (err) {
		console.error("Failed to create emergency unlock notification:", err);
	}

	return result;
};
