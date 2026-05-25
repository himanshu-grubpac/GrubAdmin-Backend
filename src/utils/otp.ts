import { randomInt } from "node:crypto";

export class Otp {
	static generateOtp(length: number = 4) {
		let otpString = "";

		for (let i = 1; i <= length; i++) {
			otpString += randomInt(0, 10).toString();
		}

		return otpString;
	}
}
