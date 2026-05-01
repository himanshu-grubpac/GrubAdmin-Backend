import { FoodTransferOwnershipOtp } from "@/db/mongo-schema";

interface CreateFoodTransferOwnershipOtpArgs {
	user_id: string;
	otp: string;
	otp_id: string;
	transfer_mode: "selected" | "all";
	ids?: string[];
	name: string;
	organization_name: string;
	country_code: string;
	phone: string;
	email: string;
	country: string;
	state: string;
}

export const createFoodTransferOwnershipOtp = async (
	args: CreateFoodTransferOwnershipOtpArgs,
) => {
	return FoodTransferOwnershipOtp.create(args);
};

export const getFoodTransferOwnershipOtp = async (user_id: string, otp_id: string) => {
	return FoodTransferOwnershipOtp.findOne({
		user_id,
		otp_id,
	});
};

export const deleteFoodTransferOwnershipOtp = async (user_id: string) => {
	return FoodTransferOwnershipOtp.deleteMany({
		user_id,
	});
};
