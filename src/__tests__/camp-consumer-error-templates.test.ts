import { describe, expect, test } from "bun:test";
import { errorTemplates } from "@/configs/error-templates";

describe("Camp consumer error templates (global barrel)", () => {
	test("camping namespace is registered in errorTemplates", () => {
		expect(errorTemplates.camping).toBeDefined();
	});

	test("camping.box.NOT_FOUND resolves with ErrorTemplate shape", () => {
		const template = (errorTemplates.camping as any).box.NOT_FOUND;
		expect(template.message).toBe("Box not found or not assigned to your account.");
		expect(template.code).toBe(404);
		expect(template.error_toast_title).toBe("Box Not Found");
		expect(template.error_toast_description).toContain("camp account");
	});

	test("camping.auth.login.OTP_EXPIRED resolves with ErrorTemplate shape", () => {
		const template = (errorTemplates.camping as any).auth.login.OTP_EXPIRED;
		expect(template.message).toBe("OTP expired or invalid.");
		expect(template.code).toBe(400);
		expect(template.error_toast_title).toBe("OTP Expired");
	});

	test("camping.auth.login.SUSPENDED resolves with ErrorTemplate shape", () => {
		const template = (errorTemplates.camping as any).auth.login.SUSPENDED;
		expect(template.message).toBe("Your account has been suspended.");
		expect(template.code).toBe(403);
	});
});
