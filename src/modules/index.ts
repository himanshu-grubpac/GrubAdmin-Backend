import { Hono } from "hono";
import { commonRouter } from "./common";
import { adminRouter } from "./admin";
import { deliveryRouter } from "@/modules/delivery";
import { deliveryMobileRouter } from "@/modules/delivery-mobile";
import { hospitalityRouter } from "@/modules/hospitality";

export const router = new Hono();

router.route("/common", commonRouter);
router.route("/admin", adminRouter);
router.route("/delivery", deliveryRouter);
router.route("/delivery-mobile", deliveryMobileRouter);
router.route("/hospitality", hospitalityRouter);

