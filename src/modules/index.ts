import { Hono } from "hono";
import { commonRouter } from "./common";
import { adminRouter } from "./admin";
import { foodRouter } from "@/modules/food";
import { foodMobileRouter } from "@/modules/food-mobile";

export const router = new Hono();

router.route("/common", commonRouter);
router.route("/admin", adminRouter);
router.route("/food", foodRouter);
router.route("/food-mobile", foodMobileRouter);
