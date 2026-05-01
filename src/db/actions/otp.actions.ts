import { Otp } from "../mongo-schema";
import { Otp as OtpUtil } from "@/utils/otp.ts";

interface SaveOtpArgs {
	otp_id?: string;
	email: string;
	otp: string;
	role: "admin" | "employee" | "client" | "super_admin" | "manager" | "delivery";
	for_what: "login" | "forget_password" | "set_new_password" | "account_update";
	is_password_reset?: boolean;
}

export const saveOtp = async (args: SaveOtpArgs) => {
	if (args.otp_id) {
		return Otp.findOneAndUpdate(
			{
				email: args.email,
				otp_id: args.otp_id,
			},
			{
				otp: args.otp,
				role: args.role,
				for_what: args.for_what,
				is_password_reset: args.is_password_reset,
				createdAt: new Date(), // Reset TTL
			},
			{
				new: true,
			},
		);
	}

	const otp_id = OtpUtil.generateOtp(6);

	return Otp.create({
		email: args.email,
		otp: args.otp,
		otp_id,
		role: args.role,
		for_what: args.for_what,
		is_password_reset: args.is_password_reset,
	});
};

export const getSavedOtp = async (email: string, otp_id?: string) => {
	if (otp_id) {
		return Otp.findOne({
			email,
			otp_id,
		});
	}
	return Otp.findOne({
		email,
	}).sort({ createdAt: -1 });
};

export const getOtpByToken = async (email: string, token: string) => {
	return Otp.findOne({
		email,
		otp: token,
	});
};

export const deleteSavedOtp = async (email: string) => {
	return Otp.deleteMany({
		email,
	});
};
