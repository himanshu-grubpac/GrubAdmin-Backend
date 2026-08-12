import { CampingConsumerOtp } from "@/db/mongo-schema";
import { Otp } from "@/utils/otp.ts";
import { Bcrypt } from "@/utils/bcrypt";

interface SaveCampingConsumerOtpArgs {
	id?: string;
	otp_id?: string;
	email: string;
	otp: string;
	for_what:
		| "login"
		| "forget_password"
		| "set_new_password"
		| "unlock_box"
		| "delete_account"
		| "register";
	metadata?: unknown;
}

export const hashCampingConsumerOtp = async (otp: string): Promise<string> => {
	return await Bcrypt.generateHash({ data: otp });
};

export const compareCampingConsumerOtp = async (
	plainOtp: string,
	hashedOtp: string,
): Promise<boolean> => {
	return await Bcrypt.compareHash({ data: plainOtp, hashedValue: hashedOtp });
};

export const saveCampingConsumerOtp = async (args: SaveCampingConsumerOtpArgs) => {
	const hashedOtp = await hashCampingConsumerOtp(args.otp);

	if (args.id || args.otp_id) {
		const filter = args.id ? { _id: args.id } : { otp_id: args.otp_id, email: args.email };
		return CampingConsumerOtp.findOneAndUpdate(
			filter,
			{
				otp: hashedOtp,
				for_what: args.for_what,
				metadata: args.metadata ?? null,
				createdAt: new Date(),
				failed_attempts: 0,
			},
			{ new: true },
		);
	}

	const otp_id = Otp.generateOtp(6);

	return CampingConsumerOtp.create({
		email: args.email,
		otp: hashedOtp,
		otp_id,
		for_what: args.for_what,
		metadata: args.metadata ?? null,
		failed_attempts: 0,
	});
};

export const getSavedCampingConsumerOtp = async (email: string, otp_id?: string) => {
	if (otp_id) {
		return CampingConsumerOtp.findOne({ otp_id, email });
	}
	return CampingConsumerOtp.findOne({ email }).sort({ createdAt: -1 });
};

export const getSavedCampingConsumerOtpById = async (id: string) => {
	return CampingConsumerOtp.findById(id);
};

export const deleteSavedCampingConsumerOtp = async (email: string) => {
	return CampingConsumerOtp.deleteMany({ email });
};
