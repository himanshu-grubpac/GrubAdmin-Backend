import { AdminUpdateOtp } from "@/db/mongo-schema";
import { Bcrypt } from "@/utils/bcrypt.ts";

interface UpsertAdminUpdateOtpArgs {
	email?: string;
	user_id: string;
	otp: string;
	mobile_number?: string;
	country_code?: string;
}

export const upsertAdminUpdateOtp = async (args: UpsertAdminUpdateOtpArgs) => {
	const update: any = {
		$set: {
			user_id: args.user_id,
			otp: args.otp,
			updatedAt: new Date(),
		},
		$setOnInsert: {
			createdAt: new Date(),
		},
	};

	if (args.email !== undefined) {
		update.$set.email = args.email;
		update.$unset = {
			...update.$unset,
			mobile_number: "",
			country_code: "",
		};
	}

	if (args.mobile_number !== undefined) {
		update.$set.mobile_number = args.mobile_number;
		update.$set.country_code = args.country_code;
		update.$unset = {
			...update.$unset,
			email: "",
		};
	}

	if (update.$unset && Object.keys(update.$unset).length === 0) {
		delete update.$unset;
	}

	await AdminUpdateOtp.findOneAndUpdate(
		{
			user_id: args.user_id,
		},
		update,
		{
			new: true,
			upsert: true,
		},
	);
};

export const getAdminUpdateOtp = async (user_id: string) => {
	return AdminUpdateOtp.findOne({
		user_id,
	});
};

export const deleteAdminUpdateOtp = async (user_id: string) => {
	return AdminUpdateOtp.findOneAndDelete({
		user_id,
	});
};
