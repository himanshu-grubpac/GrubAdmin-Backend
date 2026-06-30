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
	client_id?: string;
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
			client_id: explicitClientId,
			role_name,
			role_id,
			ip,
		} = args;

		// For client module logs, the effected_id is the client's Prisma UUID
		const clientId = explicitClientId || (module === "client" ? effected_id : undefined);

		if (
			!admin_name ||
			!admin_id ||
			role_name === undefined ||
			role_id === undefined
		) {
			logger.error("Missing logging data!");
			return;
		}

		// Never let a logging failure propagate — it would be an unhandled
		// promise rejection that crashes the process.  MongoDB may be
		// unreachable, causing the write to buffer and eventually throw.
		try {
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
		} catch (logErr) {
			logger.error(`Admin log write failed (non-fatal): ${logErr}`);
		}

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
				department: "Department",
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
				client_id: clientId,
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
