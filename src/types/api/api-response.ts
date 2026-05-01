import type { Pagination } from "./pagination";

export type APIResponse<D = void> = {
	code: number;
	client_id?: string;
	req_inputs?: any;
	pagination?: Pagination;
	debug?: {
		[key: string]: any;
	};
} & (
		| {
			success: true;
			message?: string;
			data?: D;
			message_toast_title?: string;
			message_toast_description?: string;
			message_toast_btn_title?: string;
			message_toast_btn_action?: string;
		}
		| {
			success: false;
			error: string | Array<string>;
		}
	);
