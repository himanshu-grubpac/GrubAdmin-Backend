import { prisma } from "@/db";
import type { Prisma, vertical_email_owner_type } from "@/db/types";
import { APIError } from "@/types/error";

type DbClient = Prisma.TransactionClient | typeof prisma;

export type VerticalEmailOwnerType = vertical_email_owner_type;

export const normalizeVerticalEmail = (email: string) => email.trim().toLowerCase();

const conflictError = () =>
	new APIError(
		"Email already registered with another account",
		undefined,
		undefined,
		409,
	);

const rethrowUniqueConflict = (error: unknown): never => {
	if (
		error &&
		typeof error === "object" &&
		"code" in error &&
		(error as { code?: string }).code === "P2002"
	) {
		throw conflictError();
	}
	throw error;
};

/**
 * Insert a registry row for a new owner. Relies on UNIQUE(vertical_id, email)
 * for race-safe conflict detection under concurrent creates.
 */
export const claimVerticalEmail = async (args: {
	db?: DbClient;
	verticalId: string;
	email: string;
	ownerType: VerticalEmailOwnerType;
	ownerId: string;
}) => {
	const db = args.db ?? prisma;
	const email = normalizeVerticalEmail(args.email);

	try {
		await db.vertical_email_registry.create({
			data: {
				vertical_id: args.verticalId,
				email,
				owner_type: args.ownerType,
				owner_id: args.ownerId,
			},
		});
	} catch (error) {
		rethrowUniqueConflict(error);
	}
};

export const releaseVerticalEmailByOwner = async (args: {
	db?: DbClient;
	ownerType: VerticalEmailOwnerType;
	ownerId: string;
}) => {
	const db = args.db ?? prisma;
	await db.vertical_email_registry.deleteMany({
		where: {
			owner_type: args.ownerType,
			owner_id: args.ownerId,
		},
	});
};

export const releaseVerticalEmailsByOwners = async (args: {
	db?: DbClient;
	ownerType: VerticalEmailOwnerType;
	ownerIds: string[];
}) => {
	if (args.ownerIds.length === 0) return;
	const db = args.db ?? prisma;
	await db.vertical_email_registry.deleteMany({
		where: {
			owner_type: args.ownerType,
			owner_id: { in: args.ownerIds },
		},
	});
};

/**
 * Atomically sync an owner's email in the registry (upsert on owner key).
 * Cleared email releases the claim. UNIQUE(vertical_id, email) rejects collisions.
 */
export const syncVerticalEmailRegistry = async (args: {
	db?: DbClient;
	verticalId: string;
	email: string | null | undefined;
	ownerType: VerticalEmailOwnerType;
	ownerId: string;
}) => {
	const db = args.db ?? prisma;
	const email =
		typeof args.email === "string" && args.email.trim()
			? normalizeVerticalEmail(args.email)
			: null;

	if (!email) {
		await releaseVerticalEmailByOwner({
			db,
			ownerType: args.ownerType,
			ownerId: args.ownerId,
		});
		return;
	}

	try {
		await db.vertical_email_registry.upsert({
			where: {
				owner_type_owner_id: {
					owner_type: args.ownerType,
					owner_id: args.ownerId,
				},
			},
			create: {
				vertical_id: args.verticalId,
				email,
				owner_type: args.ownerType,
				owner_id: args.ownerId,
			},
			update: {
				vertical_id: args.verticalId,
				email,
			},
		});
	} catch (error) {
		rethrowUniqueConflict(error);
	}
};
