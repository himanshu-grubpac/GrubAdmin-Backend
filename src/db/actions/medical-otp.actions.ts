import type { MedicalEmployeeRoleType } from "@/types/common";
import { MedicalEmployeeOtp } from "@/db/mongo-schema";
import { Otp } from "@/utils/otp.ts";
import { Bcrypt } from "@/utils/bcrypt";

interface SaveMedicalEmployeeOtpArgs {
	id?: string;
	otp_id?: string;
	email: string;
	otp: string;
	role: MedicalEmployeeRoleType;
	for_what: "login" | "forget_password" | "set_new_password";
	metadata?: any;
}

export const hashOtp = async (otp: string): Promise<string> => {
	return await Bcrypt.generateHash({ data: otp });
};

export const compareOtp = async (plainOtp: string, hashedOtp: string): Promise<boolean> => {
	return await Bcrypt.compareHash({ data: plainOtp, hashedValue: hashedOtp });
};

export const saveMedicalEmployeeOtp = async (args: SaveMedicalEmployeeOtpArgs) => {
	const hashedOtp = await hashOtp(args.otp);

	if (args.id || args.otp_id) {
		const filter = args.id ? { _id: args.id } : { otp_id: args.otp_id, email: args.email };
		return MedicalEmployeeOtp.findOneAndUpdate(
			filter,
			{
				otp: hashedOtp,
				role: args.role,
				for_what: args.for_what,
				metadata: args.metadata ?? null,
				createdAt: new Date(),
				failed_attempts: 0,
			},
			{ new: true }
		);
	}

	const otp_id = Otp.generateOtp(6);

	return MedicalEmployeeOtp.create({
		email: args.email,
		otp: hashedOtp,
		otp_id,
		role: args.role,
		for_what: args.for_what,
		metadata: args.metadata ?? null,
		failed_attempts: 0,
	});
};

export const getSavedMedicalEmployeeOtp = async (email: string, otp_id?: string) => {
	if (otp_id) {
		return MedicalEmployeeOtp.findOne({ otp_id, email });
	}
	return MedicalEmployeeOtp.findOne({ email }).sort({ createdAt: -1 });
};

export const getSavedMedicalEmployeeOtpById = async (id: string) => {
	return MedicalEmployeeOtp.findById(id);
};

export const deleteSavedMedicalEmployeeOtp = async (email: string) => {
	return MedicalEmployeeOtp.deleteMany({ email });
};
