import { AdminUpdateOtp } from "@/db/mongo-schema";
import { Bcrypt } from "@/utils/bcrypt.ts";

interface UpsertAdminUpdateOtpArgs {
	email?: string;
	user_id: string;
	otp: string;
	mobile_number?: string;
	country_code?: string;
}

export const upsertAdminUpdateOtp = async (args: UpsertAdminUpdateOtpArgs) => {
	const hashedOtp = await Bcrypt.generateHash({ data: args.otp });
	const adminUpdateOtp = await AdminUpdateOtp.findOneAndUpdate(
		{
			user_id: args.user_id,
		},
		{
			user_id: args.user_id,
			email: args.email ?? undefined,
			otp: hashedOtp,
			mobile_number: args.mobile_number ?? undefined,
			country_code: args.country_code ?? undefined,
			createdAt: "system",
		},
		{
			new: true,
			upsert: true,
		},
	);
};

export const getAdminUpdateOtp = async (user_id: string) => {
	return AdminUpdateOtp.findOne({
		user_id,
	});
};

export const deleteAdminUpdateOtp = async (user_id: string) => {
	return AdminUpdateOtp.findOneAndDelete({
		user_id,
	});
};
