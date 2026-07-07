import { createHandlers } from "@/utils/hono-factory";
import { campingAuthGuard } from "@/middlewares/auth";
import { updateAccountRequestBodyValidator } from "camping/validators/account.validators";
import { APIError } from "@/types/error";
import { Bcrypt } from "@/utils/bcrypt.ts";
import { Otp } from "@/utils/otp.ts";
import { prisma } from "@/db";
import { services } from "@/services";
import {
	getSavedCampingOtp,
	saveCampingOtp,
} from "@/db/actions/camping-otp.actions.ts";

export const updateAccountHandler = createHandlers(
	campingAuthGuard(),
	updateAccountRequestBodyValidator,
	async (context) => {
		const client_id = context.get("client_id");
		const body = context.req.valid("json");
		const { current_password, new_password, ...profileUpdates } = body;

		if (new_password && !current_password) {
			throw new APIError(undefined, "camping.account.PASSWORD_REQUIRED");
		}

		if (new_password && current_password) {
			const client = await prisma.client.findUnique({
				where: { id: client_id },
			});

			if (!client?.password) {
				throw new APIError("No password set for this account", undefined, undefined, 400);
			}

			const isCorrect = await Bcrypt.compareHash({
				data: current_password,
				hashedValue: client.password,
			});

			if (!isCorrect) {
				throw new APIError(undefined, "camping.auth.login.PASSWORD_INVALID");
			}

			if (current_password === new_password) {
				throw new APIError(undefined, "camping.account.SAME_PASSWORD");
			}

			const hashedPassword = await Bcrypt.generateHash({
				data: new_password,
				saltLength: 10,
			});

			(profileUpdates as any)["password"] = hashedPassword;
		}

		if (Object.keys(profileUpdates).length === 0) {
			throw new APIError("No changes provided", undefined, undefined, 400);
		}

		const client = await prisma.client.findUnique({
			where: { id: client_id },
		});

		if (body.email && body.email !== client?.email) {
			const existing = await prisma.client.findFirst({
				where: { email: body.email, id: { not: client_id } },
			});
			if (existing) {
				throw new APIError(undefined, "camping.account.EMAIL_EXISTS");
			}

			const otp = Otp.generateOtp(4);
			const clientEmail = client?.email;
			if (clientEmail) {
				const savedOtp = await saveCampingOtp({
					email: clientEmail,
					otp,
					role: "admin",
					for_what: "set_new_password",
					metadata: { pending_changes: profileUpdates },
				});

				await services.mailer.sendEmail({
					from: "ankan@sqaby.com",
					subject: "Camping Portal - Confirm Profile Update",
					to: clientEmail,
					text: `Your OTP to confirm profile update is ${otp}`,
				});

				return context.json({
					success: true,
					code: 200,
					message: "OTP sent to your email to confirm the changes",
					data: { otp_id: savedOtp?.otp_id, requires_otp: true },
				});
			}
		}

		if (body.mobile_number && body.mobile_number !== client?.mobile_number) {
			const existing = await prisma.client.findFirst({
				where: {
					country_code: body.country_code,
					mobile_number: body.mobile_number,
					id: { not: client_id },
				},
			});
			if (existing) {
				throw new APIError(undefined, "camping.account.PHONE_EXISTS");
			}
		}

		await prisma.client.update({
			where: { id: client_id },
			data: profileUpdates,
		});

		return context.json({
			success: true,
			code: 200,
			message: "Profile updated successfully",
		});
	},
);
