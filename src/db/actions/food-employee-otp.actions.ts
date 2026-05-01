import type { VerticalFoodEmployeeRoleType } from "@/types/common";
import { FoodEmployeeOtp } from "@/db/mongo-schema";
import { Otp } from "@/utils/otp.ts";

interface SaveFoodEmployeeOtpArgs {
	id?: string; // This is the mongodb _id
	otp_id?: string; // This is the 6-digit id
	email: string;
	otp: string;
	role: VerticalFoodEmployeeRoleType;
	for_what: "login" | "forget_password" | "set_new_password" | "unlock_box";
	metadata?: any;
}

export const saveFoodEmployeeOtp = async (args: SaveFoodEmployeeOtpArgs) => {
	if (args.id || args.otp_id) {
		const filter = args.id ? { _id: args.id } : { otp_id: args.otp_id, email: args.email };
		return FoodEmployeeOtp.findOneAndUpdate(
			filter,
			{
				otp: args.otp,
				role: args.role,
				for_what: args.for_what,
				metadata: args.metadata ?? null,
				createdAt: new Date(), // Reset TTL
			},
			{ new: true }
		);
	}

	const otp_id = Otp.generateOtp(6);

	return FoodEmployeeOtp.create({
		email: args.email,
		otp: args.otp,
		otp_id,
		role: args.role,
		for_what: args.for_what,
		metadata: args.metadata ?? null,
	});
};

export const getSavedFoodEmployeeOtp = async (email: string, otp_id?: string) => {
	if (otp_id) {
		return FoodEmployeeOtp.findOne({ otp_id, email });
	}
	return FoodEmployeeOtp.findOne({ email }).sort({ createdAt: -1 });
};

export const getSavedFoodEmployeeOtpById = async (id: string) => {
	return FoodEmployeeOtp.findById(id);
};

export const deleteSavedFoodEmployeeOtp = async (email: string) => {
	return FoodEmployeeOtp.deleteMany({ email });
};

