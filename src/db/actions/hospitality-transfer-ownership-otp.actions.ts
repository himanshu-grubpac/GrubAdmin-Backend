import { HospitalityTransferOwnershipOtp } from "@/db/mongo-schema";

interface CreateHospitalityTransferOwnershipOtpArgs {
	user_id: string;
	otp: string;
	otp_id: string;
	transfer_mode: "selected" | "all" | "entire_account";
	ids?: string[];
	name: string;
	organization_name: string;
	country_code: string;
	phone: string;
	email: string;
	country: string;
	state: string;
}

export const createHospitalityTransferOwnershipOtp = async (args: CreateHospitalityTransferOwnershipOtpArgs) => {
	return HospitalityTransferOwnershipOtp.create(args);
};

export const getHospitalityTransferOwnershipOtp = async (user_id: string, otp_id: string) => {
	return HospitalityTransferOwnershipOtp.findOne({ user_id, otp_id });
};

export const deleteHospitalityTransferOwnershipOtp = async (user_id: string) => {
	return HospitalityTransferOwnershipOtp.deleteMany({ user_id });
};
