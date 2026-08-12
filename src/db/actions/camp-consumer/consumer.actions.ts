import { prisma } from "@/db";
import type { vertical_camping_consumer } from "@/db/types";
import { APIError } from "@/types/error";
import { Bcrypt } from "@/utils/bcrypt";

interface GetUniqueCampingConsumerArgs {
	id?: string;
	email?: string;
	phone?: string;
	country_code?: string;
}

export const getUniqueCampingConsumer = async (
	args: GetUniqueCampingConsumerArgs,
): Promise<vertical_camping_consumer | null> => {
	const { id, email, phone, country_code } = args;

	if (id) {
		return prisma.vertical_camping_consumer.findUnique({ where: { id } });
	}

	if (email) {
		return prisma.vertical_camping_consumer.findUnique({ where: { email } });
	}

	if (phone && country_code) {
		return prisma.vertical_camping_consumer.findFirst({
			where: { phone, country_code },
		});
	}

	return null;
};

export const createPendingCampingConsumer = async (args: {
	email: string;
	phone?: string;
	country_code?: string;
	full_name?: string;
}): Promise<vertical_camping_consumer> => {
	const existing = await getUniqueCampingConsumer({
		email: args.email,
		phone: args.phone,
		country_code: args.country_code,
	});

	if (existing) {
		return existing;
	}

	return prisma.vertical_camping_consumer.create({
		data: {
			email: args.email,
			phone: args.phone,
			country_code: args.country_code,
			full_name: args.full_name,
			status: "pending",
		},
	});
};

export const activateCampingConsumer = async (id: string): Promise<vertical_camping_consumer> => {
	return prisma.vertical_camping_consumer.update({
		where: { id },
		data: { status: "active" },
	});
};

export const updateCampingConsumerProfile = async (args: {
	id: string;
	full_name?: string;
	email?: string;
	phone?: string;
	country_code?: string;
}): Promise<vertical_camping_consumer> => {
	if (args.email) {
		const duplicate = await prisma.vertical_camping_consumer.findFirst({
			where: { email: args.email, NOT: { id: args.id } },
		});
		if (duplicate) {
			throw new APIError("Email is already in use", undefined, undefined, 409);
		}
	}

	if (args.phone && args.country_code) {
		const duplicate = await prisma.vertical_camping_consumer.findFirst({
			where: {
				phone: args.phone,
				country_code: args.country_code,
				NOT: { id: args.id },
			},
		});
		if (duplicate) {
			throw new APIError("Phone number is already in use", undefined, undefined, 409);
		}
	}

	return prisma.vertical_camping_consumer.update({
		where: { id: args.id },
		data: {
			full_name: args.full_name,
			email: args.email,
			phone: args.phone,
			country_code: args.country_code,
		},
	});
};

export const setCampingConsumerPassword = async (args: {
	id: string;
	password: string;
	full_name?: string;
	email?: string;
	phone?: string;
	country_code?: string;
	activate?: boolean;
}): Promise<vertical_camping_consumer> => {
	const hashedPassword = await Bcrypt.generateHash({ data: args.password, saltLength: 10 });

	const updateData: {
		password: string;
		full_name?: string;
		email?: string;
		phone?: string;
		country_code?: string;
		status?: "active";
	} = { password: hashedPassword };

	if (args.full_name !== undefined) updateData.full_name = args.full_name;
	if (args.email !== undefined) updateData.email = args.email;
	if (args.phone !== undefined) updateData.phone = args.phone;
	if (args.country_code !== undefined) updateData.country_code = args.country_code;
	if (args.activate) updateData.status = "active";

	return prisma.vertical_camping_consumer.update({
		where: { id: args.id },
		data: updateData,
	});
};

export const changeCampingConsumerPassword = async (args: {
	id: string;
	current_password: string;
	new_password: string;
}): Promise<void> => {
	const consumer = await getUniqueCampingConsumer({ id: args.id });
	if (!consumer?.password) {
		throw new APIError("Password is not set for this account", undefined, undefined, 400);
	}

	const isValid = await Bcrypt.compareHash({
		data: args.current_password,
		hashedValue: consumer.password,
	});

	if (!isValid) {
		throw new APIError("Current password is incorrect", undefined, undefined, 401);
	}

	const hashedPassword = await Bcrypt.generateHash({ data: args.new_password, saltLength: 10 });

	await prisma.vertical_camping_consumer.update({
		where: { id: args.id },
		data: {
			password: hashedPassword,
			auth_token_version: { increment: 1 },
		},
	});
};

export const bumpCampingConsumerAuthTokenVersion = async (id: string): Promise<void> => {
	await prisma.vertical_camping_consumer.update({
		where: { id },
		data: { auth_token_version: { increment: 1 } },
	});
};

export const deleteCampingConsumer = async (id: string): Promise<void> => {
	await prisma.$transaction(async (tx) => {
		await tx.vertical_camping_consumer_box.deleteMany({ where: { consumer_id: id } });
		await tx.vertical_camping_consumer.delete({ where: { id } });
	});
};

export const getCampingConsumerClientId = (
	consumer: vertical_camping_consumer,
): string | null => consumer.client_id;
