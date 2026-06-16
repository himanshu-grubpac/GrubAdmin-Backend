import type { AdminNotificationModel } from "@/db/mongo-schema";
import { createAdminNotifications } from "@/db/actions/admin-notification.action.ts";
import { getAdmins } from "@/db/actions/admin.actions.ts";
import type {
	AdminNotificationGoal,
	AdminNotificationStatus,
	AdminNotificationType,
} from "@/types/common";

interface DeleteNotificationArgs {
	itemName: string;
	itemId: string;
	itemType: "Employee" | "Client" | "Box" | "FAQ" | "FAQ Category" | "Role";
	employeeId: string;
	employeeName: string;
}

interface CreationNotificationArgs {
	title: string;
	description: string;
	itemId?: string;
	itemName?: string;
	itemType?: string;
	employeeId?: string;
	employeeName?: string;
}

interface NotifySuperAdminArgs {
	title: string;
	description: string;
	employee_id?: string;
	employee_name?: string;
	item_id?: string;
	item_name?: string;
	item_type?: string;
	role_id?: string;
	status: AdminNotificationStatus;
	type: AdminNotificationType;
	goal: AdminNotificationGoal;
}

export class AdminNotificationService {
	private async notifySuperAdmin(args: NotifySuperAdminArgs) {
		const admins = await getAdmins({
			onlySuperAdmins: true,
		});

		console.log(admins);

		await createAdminNotifications(
			admins.admins.map((admin) => ({
				...args,
				recipient_id: admin.id,
			})),
		);
	}

	private async notifyEmployees() {}

	async notifyDeletion(args: DeleteNotificationArgs) {
		await this.notifySuperAdmin({
			title: `${args.itemName} deleted`,
			description: `${args.employeeName} ${args.employeeId} deleted ${args.itemType} - ${args.itemName} (${args.itemId}). View Details in logs`,
			type: "error",
			employee_id: args.employeeId,
			employee_name: args.employeeName,
			status: "unread",
			goal: "deletion",
			item_id: args.itemId,
			item_name: args.itemName,
			item_type: args.itemType,
		});
	}

	async notifyCreation(args: CreationNotificationArgs) {
		await this.notifySuperAdmin({
			title: args.title,
			description: args.description,
			type: "success",
			status: "unread",
			goal: "creation",
			employee_id: args.employeeId,
			employee_name: args.employeeName,
			item_id: args.itemId,
			item_name: args.itemName,
			item_type: args.itemType,
		});
	}
}
