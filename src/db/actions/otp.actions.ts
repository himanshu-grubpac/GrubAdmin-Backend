import { Otp } from "../mongo-schema";
import { Otp as OtpUtil } from "@/utils/otp.ts";
import { Bcrypt } from "@/utils/bcrypt";

interface SaveOtpArgs {
	otp_id?: string;
	email: string;
	otp: string;
	role: "admin" | "employee" | "client" | "super_admin" | "manager" | "delivery";
	for_what: "login" | "forget_password" | "set_new_password" | "account_update";
	is_password_reset?: boolean;
}

const normalizeEmail = (email: string) => email.trim().toLowerCase();

export const hashOtp = async (otp: string): Promise<string> => {
	return await Bcrypt.generateHash({ data: otp });
};


export const compareOtp = async (plainOtp: string, hashedOtp: string): Promise<boolean> => {
	return await Bcrypt.compareHash({ data: plainOtp, hashedValue: hashedOtp });
};

export const saveOtp = async (args: SaveOtpArgs) => {
	const hashedOtp = await hashOtp(args.otp);
	const email = normalizeEmail(args.email);

	if (args.otp_id) {
		return Otp.findOneAndUpdate(
			{
				email,
				otp_id: args.otp_id,
			},
			{
				otp: hashedOtp,
				role: args.role,
				for_what: args.for_what,
				is_password_reset: args.is_password_reset,
				createdAt: new Date(), 
			},
			{
				new: true,
			},
		);
	}

	const otp_id = OtpUtil.generateOtp(6);

	return Otp.create({
		email,
		otp: hashedOtp, 
		otp_id,
		role: args.role,
		for_what: args.for_what,
		is_password_reset: args.is_password_reset,
	});
};

export const getSavedOtp = async (email: string, otp_id?: string) => {
	const normalizedEmail = normalizeEmail(email);

	if (otp_id) {
		return Otp.findOne({
			email: normalizedEmail,
			otp_id,
		});
	}
	return Otp.findOne({
		email: normalizedEmail,
	}).sort({ createdAt: -1 });
};

export const getOtpByToken = async (email: string, token: string) => {
	return Otp.findOne({
		email: normalizeEmail(email),
		otp: token,
	});
};

export const deleteSavedOtp = async (email: string) => {
	return Otp.deleteMany({
		email: normalizeEmail(email),
	});
};
