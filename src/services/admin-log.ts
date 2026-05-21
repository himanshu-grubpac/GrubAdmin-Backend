import type { LogAction, LogModule } from "@/types/common/log.ts";
import { createAdminLog } from "@/db/actions/admin-log.action.ts";
import { logger } from "@/utils/logger.ts";
import { DEFAULT_IP_ADDRESS } from "@/configs/constants.ts";
import { loggerService, type LogCategory, type LogType } from "./system-log";

interface AdminLogArgs {
	module: LogModule;
	action: LogAction;
	admin_name?: string;
	admin_id?: string;
	role_name?: string | null;
	role_id?: string | null;
	effected_name?: string;
	effected_id?: string;
	ip?: string;
}

export class AdminLogService {
	async log(args: AdminLogArgs) {
		const {
			module,
			action,
			admin_name,
			admin_id,
			effected_name,
			effected_id,
			role_name,
			role_id,
			ip,
		} = args;

		if (
			!admin_name ||
			!admin_id ||
			role_name === undefined ||
			role_id === undefined
		) {
			logger.error("Missing logging data!");
			return;
		}

		await createAdminLog({
			ip: ip ?? DEFAULT_IP_ADDRESS,
			module,
			action,
			admin_name,
			admin_id,
			effected_name,
			effected_id,
			role_name,
			role_id,
		});

		// Bridge to SystemLogService for display in "System logs" page
		try {
			const categoryMap: Record<LogModule, LogCategory> = {
				employee: "Employee",
				role: "Employee",
				client: "Restaurant",
				platform: "Profile",
				support_categories: "Profile",
				FAQ: "Employee",
				grubpac: "GrubPac",
				grublock: "GrubLock",
				authentication: "Profile",
				verticals: "Profile",
			};

			const typeMap: Record<LogAction, LogType> = {
				view: "Access",
				create: "Creation",
				update: "Updation",
				delete: "Deletion",
				suspend: "Suspension",
				activate: "Activation",
				transfer: "Ownership",
				export: "Access",
				"re-order": "Updation",
				assignment: "Assignment",
				login: "Access",
				impersonation: "Access",
			};

			await loggerService.log({
				category: categoryMap[module] || "Profile",
				type: typeMap[action] || "Status",
				actor: {
					id: admin_id,
					name: admin_name,
					role: role_name || undefined,
					ip: ip ?? DEFAULT_IP_ADDRESS,
				},
				subject: effected_id ? {
					id: effected_id,
					name: effected_name || "N/A",
					type: module === "grubpac" ? "box" : module === "employee" ? "employee" : "account",
				} : undefined,
			});
		} catch (err) {
			logger.error(`Failed to bridge admin log to system log: ${err}`);
		}
	}
}
