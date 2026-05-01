export class APIError extends Error {
	code: number;
	data?: Record<string, any>;
	templatePath?: string;

	constructor(message?: string, templatePath?: string, data?: Record<string, any>, code?: number) {
		super(message || "");
		this.templatePath = templatePath;
		this.data = data;
		this.code = code ?? 400; // Default or overridden by template in handler
	}
}
