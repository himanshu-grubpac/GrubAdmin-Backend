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

/** Opaque reset link lookup — link_id is otp_id for forget_password flow. */
export const getForgetPasswordOtpByLinkId = async (link_id: string) => {
	return Otp.findOne({
		otp_id: link_id,
		for_what: "forget_password",
	});
};

export const getOtpByToken = async (email: string, token: string) => {
	const normalizedEmail = normalizeEmail(email);
	const record = await Otp.findOne({
		email: normalizedEmail,
		for_what: "forget_password",
	}).sort({ createdAt: -1 });

	if (!record) return null;

	const isMatched = await compareOtp(token, record.otp);
	if (!isMatched) return null;

	return record;
};

export const deleteSavedOtp = async (email: string) => {
	return Otp.deleteMany({
		email: normalizeEmail(email),
	});
};
