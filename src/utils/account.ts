import { prisma } from "@/db";
import { APIError } from "@/types/error";
import { normalizeVerticalEmail } from "@/utils/vertical-email-registry";

const emailConflictError = () =>
	new APIError(
		"Email already registered with another account",
		undefined,
		undefined,
		409,
	);

export type AssertEmailAvailableInVerticalOptions = {
	excludeClientId?: string;
	excludeEmployeeId?: string;
};

/**
 * Same email is allowed across different verticals.
 * Within one vertical_id it must be unique across clients and all vertical employees.
 *
 * Uses vertical_email_registry only (UNIQUE index on vertical_id + email) — O(1) lookup.
 * DB unique constraint remains the race-safe backstop on claim/sync.
 */
export const assertEmailAvailableInVertical = async (
	email: string,
	verticalId: string,
	options?: AssertEmailAvailableInVerticalOptions,
) => {
	const normalizedEmail = normalizeVerticalEmail(email);
	const { excludeClientId, excludeEmployeeId } = options ?? {};

	const excludeSelf =
		excludeClientId || excludeEmployeeId
			? {
					NOT: {
						OR: [
							...(excludeClientId
								? [
										{
											owner_type: "client" as const,
											owner_id: excludeClientId,
										},
									]
								: []),
							...(excludeEmployeeId
								? [{ owner_id: excludeEmployeeId }]
								: []),
						],
					},
				}
			: {};

	const registryHit = await prisma.vertical_email_registry.findFirst({
		where: {
			vertical_id: verticalId,
			email: normalizedEmail,
			...excludeSelf,
		},
		select: { id: true },
	});

	if (registryHit) {
		throw emailConflictError();
	}
};

/**
 * Checks if an email is already in use.
 * - Platform admins: unique globally.
 * - Clients / vertical employees: unique within `verticalId` only (cross-vertical reuse allowed).
 * When `verticalId` is omitted (admin create/update), client emails are still blocked globally
 * so platform admin emails do not collide with any customer account.
 */
export const checkEmailAvailability = async (
	email: string,
	excludeId?: string,
	verticalId?: string,
) => {
	const normalizedEmail = normalizeVerticalEmail(email);

	const existingAdmin = await prisma.admin.findUnique({
		where: { email: normalizedEmail },
		select: { id: true },
	});

	if (existingAdmin && existingAdmin.id !== excludeId) {
		throw emailConflictError();
	}

	if (verticalId) {
		await assertEmailAvailableInVertical(normalizedEmail, verticalId, {
			excludeClientId: excludeId,
		});
		return;
	}

	const existingClient = await prisma.client.findFirst({
		where: { email: normalizedEmail },
		select: { id: true },
	});

	if (existingClient && existingClient.id !== excludeId) {
		throw emailConflictError();
	}
};
