export const BOX_VERTICALS = [
	"camping",
	"medical",
	"delivery",
	"hospitality",
] as const;

export const FOOD_VERTICAL_NAME = "Food";

export const PAGE_SIZE = 40 as const;
export const LONG_PAGE_SIZE = 100 as const;
export const DEFAULT_IP_ADDRESS = "250.77.11.23";

export const CLIENT_ORDERING_FACTORS = [
	"created_at",
	"updated_at",
	"name",
	"organization_name",
] as const;

export const ICON_FOLDER_PREFIX = "icons";
export const FAQ_FOLDER_PREFIX = "faq";

export const PERMISSION_TOPICS = {
	DASHBOARD: "dashboard",
	EMPLOYEES: "employees",
	ROLES: "roles",
	SUPPORT: "support",
	CLIENTS: "clients",
	VERTICALS: "verticals",
	SYSTEM_SETTINGS: "system_settings",
	GRUBPACS: "grubpac",
} as const;

export const DASHBOARD_PERMISSIONS = {
	view_dashboard: "view dashboard",
	export_dashboard: "export dashboard",
} as const;

export const EMPLOYEES_PERMISSIONS = {
	view_active_employees: "view active employees",
	view_employee_logs: "view employee logs",
	view_suspended_employees: "view suspended employees",
	view_dismissed_employees: "view dismissed employees",
	add_employees: "add employees",
	edit_employees: "edit employees",
	delete_employees: "delete employees",
	suspend_employees: "suspend employees",
	active_employees: "active employees",
	export_employees: "export employees",
} as const;

export const ROLES_PERMISSIONS = {
	view_roles: "view roles",
	delete_roles: "delete roles",
	edit_roles: "edit roles",
	add_roles: "add roles",
} as const;

export const SUPPORT_PERMISSIONS = {
	view_active_resources: "view active resources",
	export_active_resources: "export active resources",
	add_new_category: "add new category",
	edit_category: "edit category",
	suspend_categories: "suspend categories",
	delete_categories: "delete categories",
	view_suspended_categories: "view suspended categories",
	export_suspended_categories: "export suspended_categories",
	activate_categories: "activate categories",
	add_new_question: "add new question",
	edit_questions: "edit questions",
	change_faq_category: "change faq category",
	allow_publishing: "allow publishing",
	delete_question: "delete question",
} as const;

export const CLIENTS_PERMISSIONS = {
	view_clients_list: "view clients list",
	export_clients_list: "export clients list",
	view_clients_log: "view clients log",
	view_client_account: "view client account",
	add_new_entries: "add new entries",
	edit_entries: "edit entries",
	suspend_entries: "suspend entries",
	delete_entries: "delete entries",
	export_entries: "export entries",
	edit_profile_details: "edit profile details",
} as const;

export const VERTICALS_PERMISSIONS = {
	view_verticals: "view verticals",
	add_verticals: "add verticals"
} as const;

export const SYSTEM_SETTINGS_PERMISSIONS = {
	view_configs: "view configs",
	edit_configs: "edit configs",
} as const;

export const GRUBPACS_PERMISSIONS = {
	view_grubpacs: "view grubpacs",
	add_grubpacs: "add grubpacs",
	edit_grubpacs: "edit grubpacs",
	delete_grubpacs: "delete grubpacs",
	assign_grubpacs: "assign grubpacs",
	export_grubpacs: "export grubpacs",
} as const;

export const PERMISSION_SETS = {
	[PERMISSION_TOPICS.DASHBOARD]: new Set(
		Object.values(DASHBOARD_PERMISSIONS),
	),
	[PERMISSION_TOPICS.EMPLOYEES]: new Set(
		Object.values(EMPLOYEES_PERMISSIONS),
	),
	[PERMISSION_TOPICS.ROLES]: new Set(Object.values(ROLES_PERMISSIONS)),
	[PERMISSION_TOPICS.CLIENTS]: new Set(Object.values(CLIENTS_PERMISSIONS)),
	[PERMISSION_TOPICS.SUPPORT]: new Set(Object.values(SUPPORT_PERMISSIONS)),
	[PERMISSION_TOPICS.GRUBPACS]: new Set(Object.values(GRUBPACS_PERMISSIONS)),
	[PERMISSION_TOPICS.SYSTEM_SETTINGS]: new Set(
		Object.values(SYSTEM_SETTINGS_PERMISSIONS),
	),
	verticals: new Set([...BOX_VERTICALS, ...Object.values(VERTICALS_PERMISSIONS)]),
} as const;

export const getAllPermissions = (): Record<string, string[] | Record<string, string>> => {
	const verticalsObj: Record<string, string> = {};
	for (const v of BOX_VERTICALS) {
		verticalsObj[v] = v;
	}
	for (const [key, value] of Object.entries(VERTICALS_PERMISSIONS)) {
		verticalsObj[key] = value;
	}

	return {
		[PERMISSION_TOPICS.DASHBOARD]: [...PERMISSION_SETS[PERMISSION_TOPICS.DASHBOARD]],
		[PERMISSION_TOPICS.EMPLOYEES]: [...PERMISSION_SETS[PERMISSION_TOPICS.EMPLOYEES]],
		[PERMISSION_TOPICS.ROLES]: [...PERMISSION_SETS[PERMISSION_TOPICS.ROLES]],
		[PERMISSION_TOPICS.CLIENTS]: [...PERMISSION_SETS[PERMISSION_TOPICS.CLIENTS]],
		[PERMISSION_TOPICS.SUPPORT]: [...PERMISSION_SETS[PERMISSION_TOPICS.SUPPORT]],
		[PERMISSION_TOPICS.GRUBPACS]: [...PERMISSION_SETS[PERMISSION_TOPICS.GRUBPACS]],
		[PERMISSION_TOPICS.SYSTEM_SETTINGS]: [...PERMISSION_SETS[PERMISSION_TOPICS.SYSTEM_SETTINGS]],
		[PERMISSION_TOPICS.VERTICALS]: verticalsObj,
	};
};

export const LOG_MODULES = [
	"employee",
	"role",
	"client",
	"platform",
	"support_categories",
	"FAQ",
	"grubpac",
	"grublock",
	"authentication",
	"verticals",
] as const;

export const LOG_ACTIONS = [
	"view",
	"create",
	"update",
	"delete",
	"suspend",
	"activate",
	"transfer",
	"export",
	"re-order",
	"assignment",
	"login",
	"impersonation",
] as const;

export const NOTIFICATIONS_STATUS = ["read", "unread"] as const;

export const NOTIFICATIONS_TYPE = ["success", "warning", "error"] as const;

export const NOTIFICATION_GOAL = [
	"deletion",
	"update_permission_and_roles",
	"update_profile",
	"export",
] as const;

export const EMPLOYEE_CLIENT_ROLE = [
	"admin",
	"manager",
	"delivery",
] as const;

export const GrublockStatus = ["unlocked", "locked"] as const;

export const SensorStatus = ["detected", "not_detected"] as const;

export const NetworkConnectionStatus = [
	"strong",
	"medium",
	"weak",
	"no_signal",
] as const;
