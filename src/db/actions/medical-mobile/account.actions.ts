import { prisma } from "@/db";
import { Bcrypt } from "@/utils/bcrypt";
import { APIError } from "@/types/error";

export const changeMedicalDriverPassword = async (args: {
	employee_id: string;
	current_password: string;
	new_password: string;
}): Promise<void> => {
	const employee = await prisma.vertical_medical_employee.findUnique({
		where: { id: args.employee_id },
		select: { password: true },
	});

	if (!employee?.password) {
		throw new APIError("Password is not set for this account", undefined, undefined, 400);
	}

	const isValid = await Bcrypt.compareHash({
		data: args.current_password,
		hashedValue: employee.password,
	});

	if (!isValid) {
		throw new APIError("Current password is incorrect", undefined, undefined, 401);
	}

	const hashedPassword = await Bcrypt.generateHash({ data: args.new_password, saltLength: 10 });

	await prisma.vertical_medical_employee.update({
		where: { id: args.employee_id },
		data: {
			password: hashedPassword,
			auth_token_version: { increment: 1 },
		},
	});
};

export const changeMedicalOwnerPassword = async (args: {
	client_id: string;
	current_password: string;
	new_password: string;
}): Promise<void> => {
	const client = await prisma.client.findUnique({
		where: { id: args.client_id },
		select: { password: true },
	});

	if (!client?.password) {
		throw new APIError("Password is not set for this account", undefined, undefined, 400);
	}

	const isValid = await Bcrypt.compareHash({
		data: args.current_password,
		hashedValue: client.password,
	});

	if (!isValid) {
		throw new APIError("Current password is incorrect", undefined, undefined, 401);
	}

	const hashedPassword = await Bcrypt.generateHash({ data: args.new_password, saltLength: 10 });

	await prisma.client.update({
		where: { id: args.client_id },
		data: {
			password: hashedPassword,
			auth_token_version: { increment: 1 },
		},
	});
};
