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
	verifyAuthenticatedHandler,
	sendResetPasswordOtpHandler,
	resendResetPasswordOtpHandler,
	confirmResetPasswordHandler,
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
	getDepartmentDeleteSummaryHandler,
	getDepartmentReassignmentCandidatesHandler,
	validateDepartmentReassignmentHandler,
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
	reassignGrubpacHandler,
	actionGrubpacHandler,
	getGrubpacDetailsHandler,
	suspendGrubpacHandler,
	reactivateGrubpacHandler,
	searchGrubpacHandler,
	reassignBoxEmployeeHandler,
	blockBoxEmployeeHandler,
	removeBoxEmployeeHandler,
	getGrublockHandler,
	searchGrublockHandler,
	getGrublockDetailsHandler,
	lockGrublockHandler,
	unlockGrublockHandler,
	verifyUnlockGrublockHandler,
	emergencyUnlockGrublockHandler,
	getGrubpacDropdownsHandler,
} from "medical/handlers/box";
import {
	getSupportCategoriesHandler,
	getSupportQuestionsHandler,
	searchSupportQuestionsHandler,
	getSupportAnswerHandler,
	downloadSupportAttachmentHandler,
} from "medical/handlers/support";
import {
	getNotificationsHandler,
	getNotificationDropdownsHandler,
	getUnreadNotificationsCountHandler,
	markNotificationsHandler,
} from "medical/handlers/notification";
import {
	getMyAccountHandler,
	updateAccountHandler,
	updateAccountResendOtpHandler,
	confirmUpdateAccountHandler,
	transferOwnershipHandler,
	verifyTransferOwnershipHandler,
	transferEntireAccountHandler,
	verifyTransferEntireAccountHandler,
	getMyGrubpacsHandler,
	deleteAccountHandler,
} from "medical/handlers/account";
import { getDashboardHandler } from "medical/handlers/dashboard";
import {
	searchSystemLogsHandler,
	getLogDropdownsHandler,
	postDepartmentLogsHandler,
	getDepartmentLogsDropdownsHandler,
	postEmployeeLogsHandler,
	getEmployeeLogsDropdownsHandler,
	postGrubpacLogsHandler,
	getGrubpacLogsDropdownsHandler,
	postGrublockLogsHandler,
	getGrublockLogsDropdownsHandler,
} from "medical/handlers/log";

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
medicalRouter.get("/auth/verify-authenticated", ...verifyAuthenticatedHandler);
medicalRouter.post("/auth/reset-password/otp/send", ...sendResetPasswordOtpHandler);
medicalRouter.post("/auth/reset-password/otp/resend", ...resendResetPasswordOtpHandler);
medicalRouter.post("/auth/reset-password/confirm", ...confirmResetPasswordHandler);
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
medicalRouter.get("/department/delete-summary", ...getDepartmentDeleteSummaryHandler);
medicalRouter.get("/department/reassignment-candidates", ...getDepartmentReassignmentCandidatesHandler);
medicalRouter.post("/department/reassign/validate", ...validateDepartmentReassignmentHandler);

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
medicalRouter.get("/grubpac/dropdowns", ...getGrubpacDropdownsHandler);
medicalRouter.patch("/grubpac/action", ...actionGrubpacHandler);
medicalRouter.patch("/grubpac/reassign", ...reassignGrubpacHandler);
medicalRouter.patch("/grubpac/reassign/employee", ...reassignBoxEmployeeHandler);
medicalRouter.patch("/grubpac/block/employee", ...blockBoxEmployeeHandler);
medicalRouter.patch("/grubpac/remove/employee", ...removeBoxEmployeeHandler);
medicalRouter.patch("/grubpac/suspend", ...suspendGrubpacHandler);
medicalRouter.patch("/grubpac/reactivate", ...reactivateGrubpacHandler);

/**
 * Name: Medical Support Router
 * Description: FAQ / help center for the Medical vertical
 * Base route: /api/v1/medical/support
 */
medicalRouter.get("/support/category", ...getSupportCategoriesHandler);
medicalRouter.get("/support/faq", ...getSupportQuestionsHandler);
medicalRouter.get("/support/search", ...searchSupportQuestionsHandler);
medicalRouter.get("/support/answer", ...getSupportAnswerHandler);
medicalRouter.get("/support/faq/attachment/download", ...downloadSupportAttachmentHandler);

/**
 * Name: Medical Notification Router
 * Description: GrubPac notifications scoped by department (not restaurant)
 * Base route: /api/v1/medical/notification
 */
medicalRouter.get("/notification", ...getNotificationsHandler);
medicalRouter.get("/notification/dropdowns", ...getNotificationDropdownsHandler);
medicalRouter.get("/notification/count", ...getUnreadNotificationsCountHandler);
medicalRouter.patch("/notification", ...markNotificationsHandler);

/**
 * Name: Medical Account Router
 * Base route: /api/v1/medical/account
 */
medicalRouter.get("/account/me", ...getMyAccountHandler);
medicalRouter.put("/account", ...updateAccountHandler);
medicalRouter.patch("/account/update/resend-otp", ...updateAccountResendOtpHandler);
medicalRouter.patch("/account/confirm", ...confirmUpdateAccountHandler);
medicalRouter.post("/account/transfer-ownership", ...transferOwnershipHandler);
medicalRouter.post("/account/transfer-ownership/verify", ...verifyTransferOwnershipHandler);
medicalRouter.post("/account/transfer-entire-account", ...transferEntireAccountHandler);
medicalRouter.post("/account/transfer-entire-account/verify", ...verifyTransferEntireAccountHandler);
medicalRouter.get("/account/mygrubpacs", ...getMyGrubpacsHandler);
medicalRouter.delete("/account", ...deleteAccountHandler);

/* Base route: /api/v1/medical/dashboard */
medicalRouter.get("/dashboard", ...getDashboardHandler);

/* Base route: /api/v1/medical/grublock */
medicalRouter.get("/grublock", ...getGrublockHandler);
medicalRouter.get("/grublock/search", ...searchGrublockHandler);
medicalRouter.get("/grublock/details", ...getGrublockDetailsHandler);
medicalRouter.patch("/grublock/lock", ...lockGrublockHandler);
medicalRouter.patch("/grublock/unlock", ...unlockGrublockHandler);
medicalRouter.patch("/grublock/unlock/verify", ...verifyUnlockGrublockHandler);
medicalRouter.patch("/grublock/emergency_unlock", ...emergencyUnlockGrublockHandler);

/* Base route: /api/v1/medical/logs */
medicalRouter.get("/logs/dropdowns", ...getLogDropdownsHandler);
medicalRouter.post("/logs", ...searchSystemLogsHandler);

medicalRouter.post("/department/logs", ...postDepartmentLogsHandler);
medicalRouter.get("/department/logs/dropdowns", ...getDepartmentLogsDropdownsHandler);

medicalRouter.post("/employee/logs", ...postEmployeeLogsHandler);
medicalRouter.get("/employee/logs/dropdowns", ...getEmployeeLogsDropdownsHandler);

medicalRouter.post("/grubpac/logs", ...postGrubpacLogsHandler);
medicalRouter.get("/grubpac/logs/dropdowns", ...getGrubpacLogsDropdownsHandler);

medicalRouter.post("/grublock/logs", ...postGrublockLogsHandler);
medicalRouter.get("/grublock/logs/dropdowns", ...getGrublockLogsDropdownsHandler);

