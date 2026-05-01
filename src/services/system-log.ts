import { ClientAdminLog, FoodEmployeeLog, RestaurantLog, GrubpacLog } from "@/db/mongo-schema";
import { logger } from "@/utils/logger.ts";
import { DEFAULT_IP_ADDRESS } from "@/configs/constants.ts";
import { LOG_CONFIG } from "@/configs/log.config.ts";

export type LogCategory = 
	| "Restaurant" 
	| "Employee" 
	| "GrubPac" 
	| "GrubLock" 
	| "Profile";

export type LogType = 
	| "Creation"
	| "Deletion"
	| "Suspension"
	| "Activation"
	| "Updation"
	| "Reassignment"
	| "Assignment"
	| "Connection status"
	| "Status"
	| "Emergency unlock"
	| "Ownership"
	| "Access"
	| "GrubLock"
	| "Alerts"
	| "Employee mgmt."
	| "Box mgmt."
	| "Restaurant mgmt."
	| "Box status"
	| "Door status"
	| "Temperature set"
	| "Temp. self check"
	| "Ioniser status"
	| "Battery status"
	| "Battery self check"
	| "OTP";

interface ActorInfo {
	id: string;
	name: string;
	role?: string;
	table?: string;
	ip?: string;
}

interface SubjectInfo {
	id: string;
	name: string;
	type?: "box" | "restaurant" | "employee" | "group" | "profile" | "account";
}

interface LogArgs {
	category: LogCategory;
	type: LogType;
	actor: ActorInfo;
	client_id?: string;
	subject?: SubjectInfo;
	metadata?: Record<string, any>; // For extra details like field name, old/new value, reason, etc.
}

export class SystemLogService {
	async log(args: LogArgs) {
		const { category, type, actor, client_id, subject, metadata = {} } = args;

		// Logging Feature Toggle Check
		if (!LOG_CONFIG.enabled) return;
		const categoryConfig = (LOG_CONFIG.categories as any)[category];
		if (categoryConfig) {
			if (!categoryConfig.enabled) return;
			if (categoryConfig.types && categoryConfig.types[type] === false) return;
		} else if ((LOG_CONFIG.other_types as any)[type] === false) {
			return;
		}

		if (!actor.id || !actor.name) {
			logger.error(`Missing actor data for logging: ${JSON.stringify(actor)}`);
			return;
		}

		if (actor.table === "client" && actor.role === "admin") {
			actor.role = "admin";
		}

		const description = this.generateDescription(category, type, actor, subject, metadata);

		try {
			let Model;
			switch (category) {
				case "Employee":
					Model = FoodEmployeeLog;
					break;
				case "Restaurant":
					Model = RestaurantLog;
					break;
				case "GrubPac":
				case "GrubLock":
					Model = GrubpacLog;
					break;
				case "Profile":
				default:
					Model = ClientAdminLog;
					break;
			}

			await Model.create({
				category,
				type,
				description,
				actor: {
					id: actor.id,
					name: actor.name,
					role: actor.role,
					table: actor.table,
					ip: actor.ip || DEFAULT_IP_ADDRESS,
				},
				client_id,
				subject: subject ? {
					id: subject.id,
					name: subject.name,
					type: subject.type,
				} : undefined,
				metadata,
			});
		} catch (error) {
			logger.error(`Failed to create system log: ${error}`);
		}
	}

	private generateDescription(category: LogCategory, type: LogType, actor: ActorInfo, subject?: SubjectInfo, metadata: Record<string, any> = {}): string {
		const actorLabel = `[${actor.name}, ${actor.id}]`;
		const subjectLabel = subject ? `[${subject.name}, ${subject.id}]` : "";

		switch (category) {
			case "Restaurant":
				if (type === "Creation") return `${actorLabel} added new restaurant - ${subjectLabel}`;
				if (type === "Deletion") return `${actorLabel} deleted ${subjectLabel}`;
				if (type === "Suspension") return `${actorLabel} suspended ${subjectLabel}`;
				if (type === "Activation") return `${actorLabel} reactivated ${subjectLabel}`;
				if (type === "Updation") {
					const changes = metadata.changes || [];
					if (Array.isArray(changes) && changes.length > 0) {
						const fieldList = changes.map((c: any) => c.field || "field").join(", ");
						return `${actorLabel} updated ${fieldList} of ${subjectLabel}`;
					}
					return `${actorLabel} updated ${metadata.field || "field"} of ${subjectLabel} from ${metadata.old_value || "X"} to ${metadata.new_value || "Y"}`;
				}
				break;

			case "Employee":
				if (type === "Creation") return `Account created and assigned to ${metadata.group_name || subjectLabel} by ${actorLabel}`;
				if (type === "Deletion") return `Account deleted by ${actorLabel}`;
				if (type === "Suspension") return `Account suspended by ${actorLabel}`;
				if (type === "Activation") return `Account reactivated and marked as unassigned by ${actorLabel}`;
				if (type === "Updation") {
					const changes = metadata.changes || [];
					if (Array.isArray(changes) && changes.length > 0) {
						const fieldList = changes.map((c: any) => c.field || "field").join(", ");
						return `Account ${fieldList} updated by ${actorLabel}`;
					}
					return `Account ${metadata.field || "field"} updated from ${metadata.old_value || "X"} to ${metadata.new_value || "Y"} by ${actorLabel}`;
				}
				if (type === "Reassignment") return `Account reassigned from ${metadata.old_group || "[Group name]"} to ${metadata.new_group || "[Group name]"} by ${actorLabel}`;
				if (type === "Assignment") return `Account assigned to ${metadata.new_group || "[Group name]"} by ${actorLabel}`;
				if (type === "Connection status") {
					if (metadata.disconnected) return `Disconnected from ${subjectLabel}`;
					return `Connected to ${subjectLabel}`;
				}
				break;

			case "GrubPac":
				if (type === "Suspension") return `${subjectLabel || "Box"} suspended by ${actorLabel}`;
				if (type === "Activation") return `${subjectLabel || "Box"} reactivated and marked as unassigned by ${actorLabel}`;
				if (type === "Updation") {
					const changes = metadata.changes || [];
					if (Array.isArray(changes) && changes.length > 0) {
						const fieldList = changes.map((c: any) => c.field || "field").join(", ");
						return `${subjectLabel || "Box"} ${fieldList} updated by ${actorLabel}`;
					}
					return `${subjectLabel || "Box"} ${metadata.field || "field"} updated from ${metadata.old_value || "X"} to ${metadata.new_value || "Y"} by ${actorLabel}`;
				}
				if (type === "Assignment") return `${subjectLabel || "Box"} assigned to ${metadata.new_group || "restaurant"} by ${actorLabel}`;
				if (type === "Reassignment") return `${subjectLabel || "Box"} reassigned from ${metadata.old_group || "restaurant"} to ${metadata.new_group || "restaurant"} by ${actorLabel}`;
				if (type === "Ownership") return `Ownership of ${subjectLabel || "Box"} transferred to ${metadata.new_owner || "[User info]"} by ${actorLabel}`;
				if (type === "Box status") return metadata.state === "OFF" ? `Box turned OFF` : `Box turned ON`;
				if (type === "Ioniser status") return metadata.state === "OFF" ? `Ioniser turned OFF` : `Ioniser turned ON`;
				if (type === "Connection status") return `Box connected to ${metadata.driver_name || "[Name of the driver]"}`;
				break;

			case "GrubLock":
				if (type === "Status") {
					if (metadata.action === "lock") {
						return `${actorLabel} locked ${subjectLabel} - [${metadata.recipient || "Recepient name, Contact info"}]`;
					}
					return `${actorLabel} unlocked ${subjectLabel} via OTP`;
				}
				if (type === "Emergency unlock") return `${actorLabel} unlocked ${subjectLabel} via emergency unlock. Reason - [${metadata.reason || "Reason"}]`;
				if (type === "Updation") {
					const changes = metadata.changes || [];
					if (Array.isArray(changes) && changes.length > 0) {
						const fieldList = changes.map((c: any) => c.field || "field").join(", ");
						return `${actorLabel} updated ${fieldList} for ${subjectLabel}`;
					}
					return `${actorLabel} updated recipient information for ${subjectLabel} from ${metadata.old_value || "X"} to ${metadata.new_value || "Y"}`;
				}
				break;

			case "Profile":
				if (actor.id === subject?.id) {
					// Specific to the logged-in user viewing their own logs
					if (type === "Updation") {
						const changes = metadata.changes || [];
						if (Array.isArray(changes) && changes.length > 0) {
							const fieldList = changes.map((c: any) => c.field || "field").join(", ");
							return `You updated your ${fieldList}`;
						}
						return `You updated your ${metadata.field || "profile"}`;
					}
					if (type === "Connection status") return `You connected to ${subjectLabel}`;
					if (type === "Access") return metadata.action === "logout" ? `You logged out` : `You logged in`;
				}
				if (type === "Creation") return `${actorLabel} created your account`;
				if (type === "Suspension") return `${actorLabel} suspended your account`;
				if (type === "Activation") return `${actorLabel} reactivated your account`;
				if (type === "Updation") {
					const changes = metadata.changes || [];
					if (Array.isArray(changes) && changes.length > 0) {
						const fieldList = changes.map((c: any) => c.field || "field").join(", ");
						return `${actorLabel} updated your ${fieldList}`;
					}
					return `${actorLabel} updated your ${metadata.field || "field"} from ${metadata.old_value || "X"} to ${metadata.new_value || "Y"}`;
				}
				if (type === "Reassignment" || type === "Assignment") return `${actorLabel} reassigned you from ${metadata.old_group || "[Group name, ID]"} to ${metadata.new_group || "[Group name, ID]"}`;
				break;
		}

		// Fallback for types not explicitly handled
		return `${actorLabel} performed ${type} in ${category} ${subjectLabel ? `on ${subjectLabel}` : ""}`.trim();
	}
}

export const loggerService = new SystemLogService();
