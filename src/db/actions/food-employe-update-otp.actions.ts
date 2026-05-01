import type { VerticalFoodEmployeeRoleType } from "@/types/common";
import { FoodEmployeeUpdateOtp } from "@/db/mongo-schema";
import { Otp as OtpUtil } from "@/utils/otp.ts";

interface UpsertVerticalFoodUpdateOtpArgs {
	otp_id?: string;
	email?: string;
	mobile_number?: string;
	country_code?: string;
	first_name?: string;
	last_name?: string;
	organization_name?: string;
	user_id: string;
	otp: string;
	role: VerticalFoodEmployeeRoleType;
}

export const upsertVerticalFoodUpdateOtp = async (
	args: UpsertVerticalFoodUpdateOtpArgs,
) => {
	if (args.otp_id) {
		return FoodEmployeeUpdateOtp.findOneAndUpdate(
			{
				user_id: args.user_id,
				otp_id: args.otp_id,
			},
			{
				email: args.email ?? undefined,
				mobile_number: args.mobile_number ?? undefined,
				country_code: args.country_code ?? undefined,
				first_name: args.first_name ?? undefined,
				last_name: args.last_name ?? undefined,
				organization_name: args.organization_name ?? undefined,
				otp: args.otp,
				createdAt: new Date(),
				role: args.role,
			},
			{
				new: true,
			},
		);
	}

	const otp_id = OtpUtil.generateOtp(6);

	return FoodEmployeeUpdateOtp.create({
		user_id: args.user_id,
		email: args.email ?? undefined,
		mobile_number: args.mobile_number ?? undefined,
		country_code: args.country_code ?? undefined,
		first_name: args.first_name ?? undefined,
		last_name: args.last_name ?? undefined,
		organization_name: args.organization_name ?? undefined,
		otp: args.otp,
		otp_id,
		role: args.role,
	});
};

export const getFoodEmployeeUpdateOtp = async (user_id: string, otp_id?: string) => {
	if (otp_id) {
		return FoodEmployeeUpdateOtp.findOne({
			user_id,
			otp_id,
		});
	}
	return FoodEmployeeUpdateOtp.findOne({
		user_id,
	}).sort({ createdAt: -1 });
};

export const deleteFoodEmployeeUpdateOtp = async (user_id: string) => {
	return FoodEmployeeUpdateOtp.deleteMany({
		user_id,
	});
};

