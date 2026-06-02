import type { VerticalDeliveryEmployeeRoleType } from "@/types/common";
import { DeliveryEmployeeOtp } from "@/db/mongo-schema";
import { Otp } from "@/utils/otp.ts";
import { Bcrypt } from "@/utils/bcrypt";

interface SaveDeliveryEmployeeOtpArgs {
	id?: string; // This is the mongodb _id
	otp_id?: string; // This is the 6-digit id
	email: string;
	otp: string;
	role: VerticalDeliveryEmployeeRoleType;
	for_what: "login" | "forget_password" | "set_new_password" | "unlock_box";
	metadata?: any;
}

export const hashOtp = async (otp: string): Promise<string> => {
	return await Bcrypt.generateHash({ data: otp });
};

export const compareOtp = async (plainOtp: string, hashedOtp: string): Promise<boolean> => {
	return await Bcrypt.compareHash({ data: plainOtp, hashedValue: hashedOtp });
};

export const saveDeliveryEmployeeOtp = async (args: SaveDeliveryEmployeeOtpArgs) => {
	const hashedOtp = await hashOtp(args.otp);

	if (args.id || args.otp_id) {
		const filter = args.id ? { _id: args.id } : { otp_id: args.otp_id, email: args.email };
		return DeliveryEmployeeOtp.findOneAndUpdate(
			filter,
			{
				otp: hashedOtp,
				role: args.role,
				for_what: args.for_what,
				metadata: args.metadata ?? null,
				createdAt: new Date(), // Reset TTL
				failed_attempts: 0, // Reset attempts on resend
			},
			{ new: true }
		);
	}

	const otp_id = Otp.generateOtp(6);

	return DeliveryEmployeeOtp.create({
		email: args.email,
		otp: hashedOtp,
		otp_id,
		role: args.role,
		for_what: args.for_what,
		metadata: args.metadata ?? null,
		failed_attempts: 0,
	});
};

export const getSavedDeliveryEmployeeOtp = async (email: string, otp_id?: string) => {
	if (otp_id) {
		return DeliveryEmployeeOtp.findOne({ otp_id, email });
	}
	return DeliveryEmployeeOtp.findOne({ email }).sort({ createdAt: -1 });
};

export const getSavedDeliveryEmployeeOtpById = async (id: string) => {
	return DeliveryEmployeeOtp.findById(id);
};

export const deleteSavedDeliveryEmployeeOtp = async (email: string) => {
	return DeliveryEmployeeOtp.deleteMany({ email });
};

