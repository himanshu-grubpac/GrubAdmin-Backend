import { MedicalTransferOwnershipOtp } from "@/db/mongo-schema";

interface CreateMedicalTransferOwnershipOtpArgs {
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

export const createMedicalTransferOwnershipOtp = async (args: CreateMedicalTransferOwnershipOtpArgs) => {
	return MedicalTransferOwnershipOtp.create(args);
};

export const getMedicalTransferOwnershipOtp = async (user_id: string, otp_id: string) => {
	return MedicalTransferOwnershipOtp.findOne({ user_id, otp_id });
};

export const deleteMedicalTransferOwnershipOtp = async (user_id: string) => {
	return MedicalTransferOwnershipOtp.deleteMany({ user_id });
};
