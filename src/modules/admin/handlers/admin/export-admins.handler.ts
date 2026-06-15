import { createHandlers } from "@/utils/hono-factory.ts";
import { authGuard } from "@/middlewares/auth";
import { exportAdminsRequestQueryValidator } from "@/modules/admin/validators/admin.validators.ts";
import { getAdmins, getDismissedAdmins } from "@/db/actions/admin.actions.ts";
import { json2csv } from "json-2-csv";
import { Permission } from "@/utils/permission.ts";
import { EMPLOYEES_PERMISSIONS } from "@/configs/constants.ts";
import { ipMiddleware } from "@/middlewares/common/ip.ts";
import { sanitizeCsvValue } from "@/utils/string.ts";
import { services } from "@/services";

export const exportAdminsHandler = createHandlers(
	authGuard(["admin", "employee"]),
	exportAdminsRequestQueryValidator,
	ipMiddleware,
	async (context) => {
		const {
			admin: loggedInAdmin,
			role: loggedInAdminRole,
			ip,
		} = context.var;

		Permission.checkAdminPermissions({
			admin: loggedInAdmin,
			permissions_allowed: {
				employees: [EMPLOYEES_PERMISSIONS.export_employees],
			},
		});

		const {
			query,
			status,
			page_number,
			page_size,
			role,
			fetch_all,
			include_roles,
		} = context.req.valid("query");

		const data =
			status === "dismissed"
				? await getDismissedAdmins({
						query,
						pageSize: page_size,
						pageNumber: page_number,
						role: typeof role === "string" ? [role] : role,
						fetchAll: fetch_all,
						excludeRoles: !include_roles,
					})
				: await getAdmins({
						query,
						pageSize: page_size,
						pageNumber: page_number,
						role_id: typeof role === "string" ? [role] : role,
						fetchAll: fetch_all,
						excludeRoles: !include_roles,
						status,
					});

		
		const MAX_EXPORT_LIMIT = 5000;
		const adminsToExport = data.admins.slice(0, MAX_EXPORT_LIMIT);

		const exportRows = adminsToExport.map((admin: any) => ({
			"First Name": sanitizeCsvValue(admin.first_name),
			"Last Name": sanitizeCsvValue(admin.last_name),
			"Email": sanitizeCsvValue(admin.email),
			"Employee ID": sanitizeCsvValue(admin.employee_id),
			"Location": sanitizeCsvValue(admin.location),
			"Role": sanitizeCsvValue(admin.role?.name || admin.role),
			"Status": sanitizeCsvValue(admin.status || "dismissed"),
			"Joining Date": admin.joining_date
				? new Date(admin.joining_date).toLocaleDateString()
				: "N/A",
		}));

		const csv = json2csv(exportRows, {
			emptyFieldValue: null,
			delimiter: {
				field: ",",
				wrap: '"',
			},
		});

		services.adminLogger.log({
			module: "employee",
			action: "export",
			admin_id: loggedInAdmin?.id,
			admin_name: `${loggedInAdmin?.first_name} ${loggedInAdmin?.last_name}`,
			role_id: loggedInAdmin?.role_id,
			role_name: loggedInAdminRole?.name,
			ip,
		});

		context.header("Content-Type", "text/csv; charset=utf-8");
		context.header(
			"Content-Disposition",
			`attachment; filename="admins.csv"`,
		);

		return context.body(csv);
	},
);
