import {
	BOX_VERTICALS,
	CLIENT_ORDERING_FACTORS,
	PAGE_SIZE,
	LONG_PAGE_SIZE,
} from "@/configs/constants";
import { validatorErrorHandler } from "@/utils/zod";
import { zValidator } from "@hono/zod-validator";
import z from "zod";
import { Country, State } from "country-state-city";

export const createClientRequestBodyValidator = zValidator(
	"json",
	z
		.object({
			name: z
				.string({
					error: "Please provide a name",
				})
				.trim()
				.min(1, {
					error: "Name must not be empty",
				}),
			client_id: z
				.string({
					error: "Please provide a client_id",
				})
				.trim()
				.min(1, "Client ID must not be empty"),
			email: z.string().trim().toLowerCase().email({
				error: "Please provide a valid email",
			}),
			country_code: z
				.string({
					error: "Please provide a valid country code",
				})
				.trim()
				.min(1, "CountryCode must not be empty"),
			mobile_number: z
				.string({
					error: "Please provide a valid mobile number",
				})
				.trim()
				.min(10, {
					error: "Mobile number must be 10 characters long",
				})
				.max(10, {
					error: "Mobile number must be 10 characters long",
				}),
			country: z
				.string({
					error: "Please provide a country",
				})
				.trim()
				.min(1, {
					error: "Country must not be empty",
				}),
			state: z
				.string()
				.nullable()
				.optional()
				.transform((val: string | null | undefined) => val?.trim() || null)
				.default(null),
			organization_name: z
				.string({
					error: "Please provide an organization name",
				})
				.trim()
				.min(1, {
					error: "organization name must not be empty",
				})
				.optional(),
			vertical_id: z.ulid({
				error: "Please provide a vertical id that is a valid ulid",
			}),
		})
		.superRefine((data: { country?: string; state?: string | null }, ctx: z.RefinementCtx) => {
			const countryName = data.country;
			if (!countryName) return;

			const country = Country.getAllCountries().find(
				(c) => c.name.toLowerCase() === countryName.toLowerCase(),
			);
			if (!country) return;

			const states = State.getStatesOfCountry(country.isoCode);
			if (states.length > 0 && !data.state) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: "State / Province is required for the selected region",
					path: ["state"],
				});
			}
		}),
	(result, c) => {
		if (!result.success) {
			const issues = result.error.issues;
			const verticalIdIssue = issues.find((i) => i.path.includes("vertical_id"));
			console.error(
				"[POST /admin/customer] Validation failed. Issues:",
				JSON.stringify(issues, null, 2),
			);
			if (verticalIdIssue) {
				console.error(
					"[POST /admin/customer] vertical_id error:",
					verticalIdIssue.message,
					"| received:",
					JSON.stringify((verticalIdIssue as any).received ?? "unknown"),
				);
			}
			validatorErrorHandler(result.error);
		}
	},
);

export const getClientRequestQueryValidator = zValidator(
	"query",
	z.object({
		query: z
			.string({
				error: "Please provide a query",
			})
			.trim()
			.optional(),
		page_number: z.coerce
			.number("Please provide a page number")
			.int("Page number must an integer")
			.min(1, "Page number must be at least 1")
			.default(1),
		page_size: z.coerce
			.number("Please provide a page size")
			.int("Page size must an integer")
			.min(1, "Page size must be at least 1")
			.max(LONG_PAGE_SIZE, `page_size must be less than or equal to ${LONG_PAGE_SIZE}`)
			.default(PAGE_SIZE),
		filter: z
			.union([
				z.union(
					BOX_VERTICALS.map((v) => z.literal(v)),
					{
						error: "filter must one of the valid verticals",
					},
				),
				z
					.union(
						BOX_VERTICALS.map((v) => z.literal(v)),
						{
							error: "filter must one of the valid verticals",
						},
					)
					.array(),
			])
			.optional(),
		order_factor: z
			.union(
				CLIENT_ORDERING_FACTORS.map((v) => z.literal(v)),
				{
					error: "Ordering factors must be one of created_at, updated_at, name or organization_name",
				},
			)
			.default("created_at"),
		order: z
			.union([z.literal("asc"), z.literal("desc")], {
				error: "Order must one of asc or desc",
			})
			.default("desc"),
	}),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);

export const exportClientRequestQueryValidator = zValidator(
	"query",
	z.object({
		fetch_all: z.coerce
			.boolean({
				error: "Please provide a boolean value",
			})
			.optional(),
		query: z
			.string({
				error: "Please provide a query",
			})
			.trim()
			.optional(),
		page_number: z.coerce
			.number("Please provide a page number")
			.int("Page number must an integer")
			.min(1, "Page number must be at least 1")
			.default(1),
		page_size: z.coerce
			.number("Please provide a page size")
			.int("Page size must an integer")
			.min(1, "Page size must be at least 1")
			.max(LONG_PAGE_SIZE, `page_size must be less than or equal to ${LONG_PAGE_SIZE}`)
			.default(PAGE_SIZE),
		filter: z
			.union([
				z.union(
					BOX_VERTICALS.map((v) => z.literal(v)),
					{
						error: "filter must one of the valid verticals",
					},
				),
				z
					.union(
						BOX_VERTICALS.map((v) => z.literal(v)),
						{
							error: "filter must one of the valid verticals",
						},
					)
					.array(),
			])
			.optional(),
		order_factor: z
			.union(
				CLIENT_ORDERING_FACTORS.map((v) => z.literal(v)),
				{
					error: "Ordering factors must be one of created_at, updated_at, name or organization_name",
				},
			)
			.default("created_at"),
		order: z
			.union([z.literal("asc"), z.literal("desc")], {
				error: "Order must one of asc or desc",
			})
			.default("desc"),
	}),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);

export const updateClientRequestBodyValidator = zValidator(
	"json",
	z
		.object({
			name: z.string().trim().min(1, "Name must not be empty").optional(),
			email: z.string().trim().toLowerCase().email("Please provide a valid email").optional(),
			country_code: z.string().trim().min(1, "CountryCode must not be empty").optional(),
			mobile_number: z.string().trim().length(10, "Mobile number must be 10 characters long").optional(),
			country: z.string().trim().min(1, "Country must not be empty").optional(),
			state: z
				.string()
				.nullable()
				.optional()
				.transform((val: string | null | undefined) => val?.trim() || null),
			organization_name: z.string().trim().min(1, "organization name must not be empty").optional(),
			vertical_id: z.ulid("Please provide a vertical id that is a valid ulid").optional(),
		})
		.superRefine((data: { country?: string; state?: string | null }, ctx: z.RefinementCtx) => {
			const countryCode = data.country;
			if (!countryCode || data.state === undefined) return;

			const country = Country.getAllCountries().find(
				(c) => c.name.toLowerCase() === countryCode.toLowerCase(),
			);
			if (!country) return;

			const states = State.getStatesOfCountry(country.isoCode);
			if (states.length > 0 && !data.state) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: "State / Province is required for the selected region",
					path: ["state"],
				});
			}
		}),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);

export const patchClientStatusValidator = zValidator(
	"json",
	z.object({
		status: z.enum(["active", "inactive", "suspended"], {
			error: "Status must be one of active, inactive or suspended",
		}),
	}),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);

export const clientIdParamValidator = zValidator(
	"param",
	z.object({
		id: z.ulid("Invalid Client ID"),
	}),
	(response) => {
		if (!response.success) {
			validatorErrorHandler(response.error);
		}
	},
);
