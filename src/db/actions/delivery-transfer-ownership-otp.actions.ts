import { DeliveryTransferOwnershipOtp } from "@/db/mongo-schema";

interface CreateDeliveryTransferOwnershipOtpArgs {
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

export const createDeliveryTransferOwnershipOtp = async (
	args: CreateDeliveryTransferOwnershipOtpArgs,
) => {
	return DeliveryTransferOwnershipOtp.create(args);
};

export const getDeliveryTransferOwnershipOtp = async (user_id: string, otp_id: string) => {
	return DeliveryTransferOwnershipOtp.findOne({
		user_id,
		otp_id,
	});
};

export const deleteDeliveryTransferOwnershipOtp = async (user_id: string) => {
	return DeliveryTransferOwnershipOtp.deleteMany({
		user_id,
	});
};
