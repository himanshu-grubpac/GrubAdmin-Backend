import { Hono } from "hono";
import { globalErrorHandler } from "@/middlewares/error";
import { reqInputsMiddleware } from "@/middlewares/req-inputs";
import {
	loginHandler,
	medicalImpersonateHandler,
	resendOtpHandler,
	sendOtpHandler,
	verifyOtpHandler,
	sendForgetPasswordMagicLinkHandler,
	resetPasswordMagicLinkHandler,
	verifyForgetPasswordMagicLinkHandler,
	setNewPasswordHandler,
	logoutHandler,
} from "medical/handlers/auth";
import {
	createDepartmentHandler,
	getDepartmentsHandler,
	getDepartmentByIdHandler,
	getDepartmentEmployeesHandler,
	deleteDepartmentEmployeesHandler,
	editDepartmentHandler,
	suspendDepartmentHandler,
	reactivateDepartmentHandler,
	deleteDepartmentHandler,
	assignDepartmentManagerHandler,
	reassignDepartmentHandler,
	assignEmployeesHandler,
	searchDepartmentsHandler,
} from "medical/handlers/department";
import {
	createEmployeeHandler,
	deleteEmployeesHandler,
	getEmployeesHandler,
	getEmployeeByIdHandler,
	updateEmployeeHandler,
	reactivateEmployeesHandler,
	suspendEmployeesHandler,
	getEmployeeDropdownsHandler,
	reassignEmployeeHandler,
	searchEmployeesHandler,
} from "medical/handlers/employee";
import {
	getGrubpacHandler,
	deleteGrubpacHandler,
	reassignGrubpacHandler,
	createGrubpacHandler,
	updateGrubpacHandler,
	actionGrubpacHandler,
	getGrubpacDetailsHandler,
	suspendGrubpacHandler,
	reactivateGrubpacHandler,
	searchGrubpacHandler,
	reassignBoxEmployeeHandler,
	blockBoxEmployeeHandler,
	removeBoxEmployeeHandler,
} from "medical/handlers/box";

export const medicalRouter = new Hono();

medicalRouter.onError(globalErrorHandler);
medicalRouter.use(reqInputsMiddleware);

/* Base route: /api/v1/medical/auth */
medicalRouter.post("/auth/login", ...loginHandler);
medicalRouter.post("/auth/send-otp", ...sendOtpHandler);
medicalRouter.post("/auth/verify-otp", ...verifyOtpHandler);
medicalRouter.post("/auth/resend-otp", ...resendOtpHandler);
medicalRouter.post("/auth/forget-password/send", ...sendForgetPasswordMagicLinkHandler);
medicalRouter.post("/auth/forget-password/verify", ...verifyForgetPasswordMagicLinkHandler);
medicalRouter.post("/auth/reset-password", ...resetPasswordMagicLinkHandler);
medicalRouter.post("/auth/set-password", ...setNewPasswordHandler);
medicalRouter.post("/auth/logout", ...logoutHandler);
medicalRouter.post("/auth/impersonate", ...medicalImpersonateHandler);

/**
 * Name: Medical Department Router
 * Description: This router is responsible for handling all the actions on departments
 * Base route: /api/v1/medical/department
 */
medicalRouter.post("/department", ...createDepartmentHandler);
medicalRouter.get("/department", ...getDepartmentsHandler);
medicalRouter.get("/department/details", ...getDepartmentByIdHandler);
medicalRouter.get("/department/employees", ...getDepartmentEmployeesHandler);
medicalRouter.get("/department/search", ...searchDepartmentsHandler);
medicalRouter.patch("/department/resource/suspend", ...suspendDepartmentHandler);
medicalRouter.patch("/department/suspend", ...suspendDepartmentHandler);
medicalRouter.patch("/department/reactivate", ...reactivateDepartmentHandler);
medicalRouter.put("/department", ...editDepartmentHandler);
medicalRouter.patch("/department/manager", ...assignDepartmentManagerHandler);
medicalRouter.patch("/department/resource/reassign", ...reassignDepartmentHandler);
medicalRouter.delete("/department", ...deleteDepartmentHandler);
medicalRouter.delete("/department/employees", ...deleteDepartmentEmployeesHandler);
medicalRouter.patch("/department/assign", ...assignEmployeesHandler);

/**
 * Name: Medical Employee Router
 * Description: This router handles employee management
 * Base route: /api/v1/medical/employee
 */
medicalRouter.post("/employee", ...createEmployeeHandler);
medicalRouter.get("/employee", ...getEmployeesHandler);
medicalRouter.get("/employee/details", ...getEmployeeByIdHandler);
medicalRouter.get("/employee/dropdowns", ...getEmployeeDropdownsHandler);
medicalRouter.get("/employee/search", ...searchEmployeesHandler);
medicalRouter.patch("/employee/suspend", ...suspendEmployeesHandler);
medicalRouter.patch("/employee/reactivate", ...reactivateEmployeesHandler);
medicalRouter.put("/employee", ...updateEmployeeHandler);
medicalRouter.patch("/employee/reassign", ...reassignEmployeeHandler);
medicalRouter.delete("/employee", ...deleteEmployeesHandler);

/**
 * Name: Medical Grubpac (Box) Router
 * Description: This router handles box management
 * Base route: /api/v1/medical/grubpac
 */
medicalRouter.get("/grubpac", ...getGrubpacHandler);
medicalRouter.get("/grubpac/search", ...searchGrubpacHandler);
medicalRouter.get("/grubpac/details", ...getGrubpacDetailsHandler);
medicalRouter.patch("/grubpac/action", ...actionGrubpacHandler);
medicalRouter.post("/grubpac", ...createGrubpacHandler);
medicalRouter.put("/grubpac", ...updateGrubpacHandler);
medicalRouter.delete("/grubpac", ...deleteGrubpacHandler);
medicalRouter.patch("/grubpac/reassign", ...reassignGrubpacHandler);
medicalRouter.patch("/grubpac/reassign/employee", ...reassignBoxEmployeeHandler);
medicalRouter.patch("/grubpac/block/employee", ...blockBoxEmployeeHandler);
medicalRouter.patch("/grubpac/remove/employee", ...removeBoxEmployeeHandler);
medicalRouter.patch("/grubpac/suspend", ...suspendGrubpacHandler);
medicalRouter.patch("/grubpac/reactivate", ...reactivateGrubpacHandler);

/* Note: GrubLock, Account, Dashboard, Support, Logs, Notification endpoints
   are NOT included here — they will be implemented by another developer. */
