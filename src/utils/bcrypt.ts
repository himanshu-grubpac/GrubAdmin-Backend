import { compare, genSalt, hash } from "bcryptjs";

interface GenerateHashArgs {
	saltLength?: number;
	data: string;
}

interface CompareHashArgs {
	data: string;
	hashedValue: string;
}

export class Bcrypt {
	static async generateHash(args: GenerateHashArgs) {
		const salt = await genSalt(args.saltLength ?? 10);

		return await hash(args.data, salt);
	}

	static async compareHash(args: CompareHashArgs) {
		return await compare(args.data, args.hashedValue);
	}
}
