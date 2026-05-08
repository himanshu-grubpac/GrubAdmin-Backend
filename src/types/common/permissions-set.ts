import {
	BOX_VERTICALS,
	CLIENTS_PERMISSIONS,
	DASHBOARD_PERMISSIONS,
	EMPLOYEES_PERMISSIONS,
	PERMISSION_TOPICS,
	ROLES_PERMISSIONS,
	SUPPORT_PERMISSIONS,
	VERTICALS_PERMISSIONS,
} from "@/configs/constants.ts";

const PERMISSIONS = {
	[PERMISSION_TOPICS.DASHBOARD]: DASHBOARD_PERMISSIONS,
	[PERMISSION_TOPICS.EMPLOYEES]: EMPLOYEES_PERMISSIONS,
	[PERMISSION_TOPICS.ROLES]: ROLES_PERMISSIONS,
	[PERMISSION_TOPICS.SUPPORT]: SUPPORT_PERMISSIONS,
	[PERMISSION_TOPICS.CLIENTS]: CLIENTS_PERMISSIONS,
	verticals: {
		camping: "camping",
		medical: "medical",
		delivery: "delivery",
		hospitality: "hospitality",
		view_verticals: "view verticals",
		add_verticals: "add verticals"
		
	},
} as const;

type PERMS = typeof PERMISSIONS;
export type TopicKey = keyof PERMS;

export type PermissionLabelFor<K extends TopicKey> = PERMS[K][keyof PERMS[K]];

export type PermissionAllowed = {
	[K in TopicKey]?: Array<PermissionLabelFor<K>>;
};
