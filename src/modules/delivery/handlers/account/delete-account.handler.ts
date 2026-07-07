import { createHandlers } from "@/utils/hono-factory.ts";
import { deliveryAuthGuard } from "@/middlewares/auth";
import { APIError } from "@/types/error";
import { deleteVerticalDeliveryEmployees } from "@/db/actions/vertical-delivery-employee.actions";
import type { APIResponse } from "@/types/api";
import { prisma } from "@/db";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import {
	deleteAccountRequestBodyValidator,
	resendDeleteAccountOtpRequestBodyValidator,
} from "delivery/validators/account.validators.ts";
import {
	compareOtp,
	deleteSavedDeliveryEmployeeOtp,
	getSavedDeliveryEmployeeOtp,
	saveDeliveryEmployeeOtp,
} from "@/db/actions/delivery-employee-otp.actions.ts";
import { Otp } from "@/utils/otp.ts";
import { services } from "@/services";
import type { Context } from "hono";
import type { VerticalDeliveryEmployeeRoleType } from "@/types/common";

function assertDeleteAccountAllowed(type: string, userEmail?: string | null) {
	if (!userEmail) {
		throw new APIError(undefined, "delivery.auth.login.EMAIL_NOT_FOUND", undefined, 400);
	}

	if (type === "admin") {
		throw new APIError(
			"Administrators cannot delete their accounts through this API.",
			"delivery.account.ADMIN_DELETE_BLOCKED",
			undefined,
			400,
		);
	}
}

async function issueDeleteAccountOtp(
	context: Context,
	userEmail: string,
	role: VerticalDeliveryEmployeeRoleType,
	targetOtpId?: string,
) {
	const savedOtp = targetOtpId
		? await getSavedDeliveryEmployeeOtp(userEmail, targetOtpId)
		: await getSavedDeliveryEmployeeOtp(userEmail);

	if (savedOtp?.for_what === "delete_account") {
		const timeDiff = Date.now() - new Date(savedOtp.createdAt).getTime();
		if (timeDiff < 60000) {
			throw new APIError("Please wait 60 seconds before requesting a new OTP.", undefined, undefined, 429);
		}
	}

	const otp = Otp.generateOtp(4);
	const updatedOtpRecord = await saveDeliveryEmployeeOtp({
		otp_id: savedOtp?.for_what === "delete_account" ? savedOtp.otp_id : undefined,
		email: userEmail,
		otp,
		role,
		for_what: "delete_account",
	});

	if (!updatedOtpRecord) {
		throw new APIError(undefined, "delivery.auth.login.OTP_SAVE_FAILED");
	}

	setCookie(context, "delete_otp_id", updatedOtpRecord.otp_id, {
		path: "/",
		httpOnly: true,
		maxAge: 60 * 5,
		sameSite: "Lax",
	});

	await services.mailer.sendEmail({
		from: "ankan@sqaby.com",
		subject: "Delivery Portal - Account Deletion OTP",
		to: userEmail,
		text: `Your OTP to confirm account deletion is ${otp} (OTP Session ID: ${updatedOtpRecord.otp_id})`,
	});

	return updatedOtpRecord.otp_id;
}

export const requestDeleteAccountOtpHandler = createHandlers(
	deliveryAuthGuard(),
	async (context) => {
		const { user, type } = context.var;
		assertDeleteAccountAllowed(type, user.email);

		const otp_id_cookie = getCookie(context, "delete_otp_id");
		const otp_id = await issueDeleteAccountOtp(
			context,
			user.email!,
			type,
			otp_id_cookie,
		);

		return context.json<APIResponse<{ otp_id: string }>>(
			{
				success: true,
				code: 200,
				data: { otp_id },
			},
			{ status: 200 },
		);
	},
);

export const resendDeleteAccountOtpHandler = createHandlers(
	deliveryAuthGuard(),
	resendDeleteAccountOtpRequestBodyValidator,
	async (context) => {
		const { user, type } = context.var;
		assertDeleteAccountAllowed(type, user.email);

		const { otp_id: otp_id_body } = context.req.valid("json");
		const otp_id_cookie = getCookie(context, "delete_otp_id");
		const target_otp_id = otp_id_body || otp_id_cookie;
		const otp_id = await issueDeleteAccountOtp(
			context,
			user.email!,
			type,
			target_otp_id,
		);

		return context.json<APIResponse<{ otp_id: string }>>(
			{
				success: true,
				code: 200,
				data: { otp_id },
			},
			{ status: 200 },
		);
	},
);

export const deleteAccountHandler = createHandlers(
	deliveryAuthGuard(),
	deleteAccountRequestBodyValidator,
	async (context) => {
		const { type, user, client_id } = context.var;
		const { otp, otp_id: otp_id_body } = context.req.valid("json");
		const otp_id_cookie = getCookie(context, "delete_otp_id");
		const target_otp_id = otp_id_body || otp_id_cookie;
		const userEmail = user.email;

		assertDeleteAccountAllowed(type, userEmail);

		const savedOtp = await getSavedDeliveryEmployeeOtp(userEmail!, target_otp_id);
		if (!savedOtp || savedOtp.for_what !== "delete_account") {
			throw new APIError(undefined, "delivery.auth.login.OTP_INVALID", undefined, 400);
		}

		const isOtpValid = await compareOtp(otp, savedOtp.otp);
		if (!isOtpValid) {
			throw new APIError(undefined, "delivery.auth.login.OTP_INVALID", undefined, 400);
		}

		const connectionBoxCount = await prisma.box.count({
			where: {
				connection_employee_id: user.id,
				status: "active",
			},
		});

		const sharedBoxCount = await prisma.vertical_delivery_employee_box.count({
			where: {
				employee_id: user.id,
				box: { status: "active" },
			},
		});

		if (connectionBoxCount > 0 || sharedBoxCount > 0) {
			throw new APIError(
				"Cannot delete account: you are still assigned as an active manager/employee of active Grubpacs.",
				"delivery.account.DELETE_BLOCKED",
				undefined,
				400,
			);
		}

		await deleteVerticalDeliveryEmployees({
			ids: [user.id],
			client_id,
		});

		await deleteSavedDeliveryEmployeeOtp(userEmail!);
		deleteCookie(context, "auth_token", { path: "/" });
		deleteCookie(context, "otp_id", { path: "/" });
		deleteCookie(context, "delete_otp_id", { path: "/" });

		return context.json<APIResponse>(
			{
				success: true,
				code: 200,
			},
			{
				status: 200,
			},
		);
	},
);
