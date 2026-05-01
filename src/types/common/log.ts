import { LOG_ACTIONS, type LOG_MODULES } from "@/configs/constants.ts";

export type LogModule = (typeof LOG_MODULES)[number];
export type LogAction = (typeof LOG_ACTIONS)[number];
