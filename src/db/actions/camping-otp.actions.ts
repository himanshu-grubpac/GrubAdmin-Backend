import type { CampingEmployeeRoleType } from "@/types/common";
import { CampingEmployeeOtp } from "@/db/mongo-schema";
import { Otp } from "@/utils/otp.ts";
import { Bcrypt } from "@/utils/bcrypt";

interface SaveCampingOtpArgs {
	otp_id?: string;
	email: string;
	otp: string;
	role: CampingEmployeeRoleType;
	for_what: "login" | "forget_password" | "set_new_password";
	metadata?: any;
}

export const hashOtp = async (otp: string): Promise<string> => {
	return await Bcrypt.generateHash({ data: otp });
};

export const compareOtp = async (plainOtp: string, hashedOtp: string): Promise<boolean> => {
	return await Bcrypt.compareHash({ data: plainOtp, hashedValue: hashedOtp });
};

export const saveCampingOtp = async (args: SaveCampingOtpArgs) => {
	const hashedOtp = await hashOtp(args.otp);

	if (args.otp_id) {
		return CampingEmployeeOtp.findOneAndUpdate(
			{ otp_id: args.otp_id, email: args.email },
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

	return CampingEmployeeOtp.create({
		email: args.email,
		otp: hashedOtp,
		otp_id,
		role: args.role,
		for_what: args.for_what,
		metadata: args.metadata ?? null,
		failed_attempts: 0,
	});
};

export const getSavedCampingOtp = async (email: string, otp_id?: string) => {
	if (otp_id) {
		return CampingEmployeeOtp.findOne({ otp_id, email });
	}
	return CampingEmployeeOtp.findOne({ email }).sort({ createdAt: -1 });
};

export const deleteSavedCampingOtp = async (email: string) => {
	return CampingEmployeeOtp.deleteMany({ email });
};
