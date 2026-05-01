import type { LogAction, LogModule } from "@/types/common/log.ts";
import { createAdminLog } from "@/db/actions/admin-log.action.ts";
import { logger } from "@/utils/logger.ts";
import { DEFAULT_IP_ADDRESS } from "@/configs/constants.ts";

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
	}
}
