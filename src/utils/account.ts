import { prisma } from "@/db";
import { APIError } from "@/types/error";

/**
 * Checks if an email is already in use by an Admin or a Client.
 * Emails are normalized (trimmed and lowercased) before comparison.
 * 
 * @param email - The email to check
 * @param excludeId - Optional ID to exclude from the check (useful for updates)
 * @throws APIError - If the email is already registered
 */
export const checkEmailAvailability = async (email: string, excludeId?: string) => {
	const normalizedEmail = email.trim().toLowerCase();

	// Check Admin table
	const existingAdmin = await prisma.admin.findUnique({
		where: { email: normalizedEmail },
	});

	if (existingAdmin && existingAdmin.id !== excludeId) {
		throw new APIError("Email already registered with another account", undefined, undefined, 409);
	}

	// Check Client table
	const existingClient = await prisma.client.findFirst({
		where: { email: normalizedEmail },
	});

	if (existingClient && existingClient.id !== excludeId) {
		throw new APIError("Email already registered with another account", undefined, undefined, 409);
	}
};
