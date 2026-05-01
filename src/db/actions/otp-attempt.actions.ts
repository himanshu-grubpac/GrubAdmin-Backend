import { OtpAttempt } from "../mongo-schema";

interface GetOtpAttemptArgs {
	email: string;
	ip_address: string;
}

interface IncrementOtpAttemptArgs {
	email: string;
	ip_address: string;
	max_attempts?: number;
	lock_duration_minutes?: number;
}

interface ResetOtpAttemptArgs {
	email: string;
	ip_address: string;
}

export const getOtpAttempt = async (args: GetOtpAttemptArgs) => {
	return OtpAttempt.findOne({
		email: args.email,
		ip_address: args.ip_address,
	});
};

export const isOtpAttemptLocked = async (args: GetOtpAttemptArgs): Promise<boolean> => {
    const attempt = await getOtpAttempt(args);

    if (!attempt) return false;

    if (attempt.is_locked && attempt.lock_until) {
	const now = Date.now();
	const lockTime = new Date(attempt.lock_until).getTime();

	if (now < lockTime) {
		return true;
	} else {
		await unlockOtpAttempt(args);
		return false;
	}
}

    return false;
};


export const incrementOtpAttempt = async (args: IncrementOtpAttemptArgs) => {
	const { email, ip_address, max_attempts = 5, lock_duration_minutes = 30 } = args;

	const attempt = await OtpAttempt.findOneAndUpdate(
		{ email, ip_address },
		{
			$setOnInsert: {
				email,
				ip_address,
				attempts: 0,
				is_locked: false,
				lock_until: null,
			},
		},
		{ upsert: true, new: true }
	);

	
	attempt.attempts += 1;
	attempt.last_attempt = new Date();

	if (attempt.attempts >= max_attempts) {
		attempt.is_locked = true;
		attempt.lock_until = new Date(Date.now() + lock_duration_minutes * 60 * 1000);
	}

	return attempt.save();
};

export const resetOtpAttempt = async (args: ResetOtpAttemptArgs) => {
	return OtpAttempt.findOneAndUpdate(
		{ email: args.email, ip_address: args.ip_address },
		{
			attempts: 0,
			is_locked: false,
			lock_until: null,
			last_attempt: new Date(),
		},
		{ upsert: true, new: true }
	);
};

export const unlockOtpAttempt = async (args: GetOtpAttemptArgs) => {
	return OtpAttempt.findOneAndUpdate(
		{ email: args.email, ip_address: args.ip_address },
		{
			is_locked: false,
			lock_until: null,
			attempts: 0, 
		}
	);
};


export const getOtpLockoutRemaining = async (args: GetOtpAttemptArgs): Promise<number | null> => {
	const attempt = await getOtpAttempt(args);

	if (!attempt?.is_locked || !attempt.lock_until) {
		return null;
	}

	const now = new Date();
	const remainingMs = attempt.lock_until.getTime() - now.getTime();

	if (remainingMs <= 0) {
		return null; 
	}

	return Math.ceil(remainingMs / (1000 * 60)); 
};