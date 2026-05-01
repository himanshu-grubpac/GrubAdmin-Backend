"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.confirmUpdateAccountHandler = void 0;
var hono_factory_ts_1 = require("@/utils/hono-factory.ts");
var auth_1 = require("@/middlewares/auth");
var account_validators_ts_1 = require("food/validators/account.validators.ts");
var food_employe_update_otp_actions_ts_1 = require("@/db/actions/food-employe-update-otp.actions.ts");
var error_1 = require("@/types/error");
var vertical_client_employee_actions_ts_1 = require("@/db/actions/vertical-client-employee.actions");
var message_1 = require("@/utils/message");
var cookie_1 = require("hono/cookie");
exports.confirmUpdateAccountHandler = (0, hono_factory_ts_1.createHandlers)((0, auth_1.foodAuthGuard)(), account_validators_ts_1.confirmUpdateAccountRequestBodyValidator, function (context) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, user, type, _b, otp, otp_id_body, otp_id_cookie, target_otp_id, updatedDetails, updateData, otp_id, response;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _a = context.var, user = _a.user, type = _a.type;
                _b = context.req.valid("json"), otp = _b.otp, otp_id_body = _b.otp_id;
                otp_id_cookie = (0, cookie_1.getCookie)(context, "otp_id");
                target_otp_id = otp_id_body || otp_id_cookie;
                return [4 /*yield*/, (0, food_employe_update_otp_actions_ts_1.getFoodEmployeeUpdateOtp)(user.id, target_otp_id)];
            case 1:
                updatedDetails = _c.sent();
                if (!updatedDetails) {
                    throw new error_1.APIError(undefined, "food.account.NO_CHANGE_REQUESTS");
                }
                if (otp !== updatedDetails.otp) {
                    throw new error_1.APIError(undefined, "food.auth.login.OTP_INVALID");
                }
                updateData = {
                    id: user.id,
                    type: type,
                };
                if (updatedDetails.email)
                    updateData.email = updatedDetails.email;
                if (updatedDetails.mobile_number)
                    updateData.mobile_number = updatedDetails.mobile_number;
                if (updatedDetails.country_code)
                    updateData.country_code = updatedDetails.country_code;
                if (updatedDetails.first_name)
                    updateData.first_name = updatedDetails.first_name;
                if (updatedDetails.last_name !== null && updatedDetails.last_name !== undefined)
                    updateData.last_name = updatedDetails.last_name;
                // organization_name → mapped to "organization" arg → updates client.organization_name
                if (updatedDetails.organization_name)
                    updateData.organization = updatedDetails.organization_name;
                // updateVerticalClientEmployee routes to client or vertical_client_employee based on type
                return [4 /*yield*/, (0, vertical_client_employee_actions_ts_1.updateVerticalClientEmployee)(updateData)];
            case 2:
                // updateVerticalClientEmployee routes to client or vertical_client_employee based on type
                _c.sent();
                return [4 /*yield*/, (0, food_employe_update_otp_actions_ts_1.deleteFoodEmployeeUpdateOtp)(user.id)];
            case 3:
                _c.sent();
                otp_id = updatedDetails.otp_id;
                (0, cookie_1.setCookie)(context, "otp_id", otp_id, {
                    path: "/",
                    httpOnly: true,
                    maxAge: 60 * 5,
                    sameSite: "Lax",
                });
                response = __assign(__assign({ success: true }, (0, message_1.resolveMessageTemplate)("food.employee.profile.UPDATE_SUCCESS", { id: user.id })), { is_otp: false, has_changed: true, message_debug: "The OTP has been successfully verified, and the requested changes have been applied.", data: {
                        otp_id: otp_id,
                    } });
                return [2 /*return*/, context.json(response, response.code)];
        }
    });
}); });
