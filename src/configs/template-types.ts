/**
 * Shared template type definitions for GrubPac error and message templates.
 * Kept separate from the barrel files to avoid circular imports between
 * src/configs and src/modules.
 */

export interface ErrorTemplate {
	message: string;
	code: number;
	error_toast_title: string;
	error_toast_description: string;
	error_toast_btn_title?: string;
	error_toast_btn_action?: string;
}

export type ErrorTemplateMap = {
	[key: string]: ErrorTemplate | ErrorTemplateMap;
};

export interface MessageTemplate {
	message: string;
	code: number;
	message_toast_title: string;
	message_toast_description: string;
	message_toast_btn_title?: string;
	message_toast_btn_action?: string;
}

export type MessageTemplateMap = {
	[key: string]: MessageTemplate | MessageTemplateMap;
};
