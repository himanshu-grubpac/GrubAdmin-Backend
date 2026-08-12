import { APIError } from "@/types/error";
import { Otp } from "@/utils/otp.ts";
import {
	saveCampingConsumerOtp,
} from "@/db/actions/camping-consumer-otp.actions.ts";
import { services } from "@/services";
import type { vertical_camping_consumer } from "@/db/types";

export function assertCampingConsumer(
	consumer: vertical_camping_consumer | null,
): asserts consumer is vertical_camping_consumer {
	if (!consumer) {
		throw new APIError("No consumer account found!", undefined, undefined, 400);
	}
	if (consumer.status === "suspended") {
		throw new APIError("Your account has been suspended!", undefined, undefined, 403);
	}
}

export const resolveConsumerEmail = (consumer: vertical_camping_consumer): string => {
	const email = consumer.email?.trim();
	if (!email) {
		throw new APIError("No email found for this account!", undefined, undefined, 400);
	}
	return email;
};

export const sendOtpToConsumer = async (
	consumer: vertical_camping_consumer,
	for_what:
		| "login"
		| "forget_password"
		| "set_new_password"
		| "register" = "login",
) => {
	assertCampingConsumer(consumer);
	const email = resolveConsumerEmail(consumer);
	const otp = Otp.generateOtp(4);

	await saveCampingConsumerOtp({
		email,
		otp,
		for_what,
	});

	const subject =
		for_what === "login" || for_what === "register"
			? "Camp Consumer - Login OTP"
			: "Camp Consumer - Reset Password OTP";
	const text =
		for_what === "login" || for_what === "register"
			? `Your OTP to log into the Camp Consumer app is ${otp}`
			: `Your OTP for resetting your password is ${otp}`;

	await services.mailer.sendEmail({
		from: "ankan@sqaby.com",
		subject,
		to: email,
		text,
	});

	return { otp, email };
};

export const getConsumerClientId = (
	consumer: vertical_camping_consumer,
): string | undefined => consumer.client_id ?? undefined;

export const buildCampingAuthPayload = (consumer: vertical_camping_consumer) => ({
	id: consumer.id,
	type: "consumer" as const,
	token_version: consumer.auth_token_version ?? 0,
});
