import { Mail } from "./mail";
import { s3Service } from "@/services/s3.ts";
import { AdminLogService } from "@/services/admin-log.ts";
import { AdminNotificationService } from "@/services/admin-notification.ts";
import { GoogleMap } from "./google-map";

export const services = {
	mailer: new Mail(),
	s3: new s3Service(),
	adminLogger: new AdminLogService(),
	adminNotifications: new AdminNotificationService(),
	mapService: new GoogleMap(),
};

Object.freeze(services);
