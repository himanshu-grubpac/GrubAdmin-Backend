import { APIError } from "@/types/error";
import { BoxConfig } from "@/db/mongo-schema";
import { isMongoConnected, getMongoConnectionState } from "@/db";
import { logger } from "@/utils/logger";
import type {
  ResourceLifecycleService,
  ResourceLifecycleContext,
  ResourceOperationResult,
  TransactionClient,
} from "./types";

const requireMongoDB = (operation: string): void => {
  if (!isMongoConnected()) {
    logger.error(
      `MongoDB not connected — cannot execute "${operation}". State: ${getMongoConnectionState()}`,
    );
    throw new APIError(
      "Database service temporarily unavailable. Please try again.",
      undefined,
      undefined,
      503,
    );
  }
};

export class BoxLifecycleService implements ResourceLifecycleService {
  readonly resourceType = "box" as const;

  private async getBoxIdsByRestaurants(
    restaurant_ids: string[],
    tx: TransactionClient,
  ): Promise<string[]> {
    const rbs = await tx.restaurant_box.findMany({
      where: { restaurant_id: { in: restaurant_ids } },
      select: { box_id: true },
    });
    return [...new Set(rbs.map((rb) => rb.box_id))];
  }

  async suspendResources(
    ctx: ResourceLifecycleContext,
    tx: TransactionClient,
  ): Promise<ResourceOperationResult> {
    const { restaurant_ids } = ctx;

    const boxIds = await this.getBoxIdsByRestaurants(restaurant_ids, tx);

    if (boxIds.length === 0) {
      return {
        resource_type: "box",
        updated_count: 0,
        skipped_count: 0,
        details: { note: "no_boxes_found" },
      };
    }

    const boxes = await tx.box.findMany({
      where: { id: { in: boxIds } },
      select: { id: true, status: true },
    });

    const alreadySuspended = boxes.filter((b) => b.status === "suspended");
    const toUpdate = boxes.filter((b) => b.status !== "suspended");

    if (toUpdate.length > 0) {
      await tx.box.updateMany({
        where: { id: { in: toUpdate.map((b) => b.id) } },
        data: { status: "suspended" },
      });
    }

    return {
      resource_type: "box",
      updated_count: toUpdate.length,
      skipped_count: alreadySuspended.length,
      details: { total_box_ids: boxIds.length },
    };
  }

  async unassignResources(
    ctx: ResourceLifecycleContext,
    tx: TransactionClient,
  ): Promise<ResourceOperationResult> {
    const { restaurant_ids } = ctx;

    const boxIds = await this.getBoxIdsByRestaurants(restaurant_ids, tx);

    if (boxIds.length === 0) {
      return {
        resource_type: "box",
        updated_count: 0,
        skipped_count: 0,
        details: { note: "no_boxes_found" },
      };
    }

    const boxes = await tx.box.findMany({
      where: { id: { in: boxIds } },
      select: { id: true, status: true },
    });

    const alreadyUnassigned = boxes.filter((b) => b.status === ("unassigned" as any));
    const toUpdate = boxes.filter((b) => b.status !== ("unassigned" as any));

    await tx.restaurant_box.deleteMany({
      where: { box_id: { in: boxIds } },
    });

    await tx.vertical_delivery_employee_box.deleteMany({
      where: { box_id: { in: boxIds } },
    });

    if (toUpdate.length > 0) {
      await tx.box.updateMany({
        where: { id: { in: toUpdate.map((b) => b.id) } },
        data: { status: "unassigned" as any },
      });
    }

    try {
      requireMongoDB("BoxConfig.updateMany");
      await BoxConfig.updateMany(
        { box_id: { $in: boxIds } },
        { $set: { driver_id: null, restaurant_id: null } },
      );
    } catch (err) {
      logger.warn(
        `MongoDB BoxConfig update failed during box unassign: ${err}`,
      );
    }

    return {
      resource_type: "box",
      updated_count: toUpdate.length + boxIds.length,
      skipped_count: alreadyUnassigned.length,
      details: { total_box_ids: boxIds.length },
    };
  }

  async reassignResources(
    ctx: ResourceLifecycleContext,
    tx: TransactionClient,
  ): Promise<ResourceOperationResult> {
    const { destination_restaurant_id } = ctx;

    if (!destination_restaurant_id) {
      return this.unassignResources(ctx, tx);
    }

    const boxIds = await this.getBoxIdsByRestaurants(
      ctx.restaurant_ids,
      tx,
    );

    if (boxIds.length === 0) {
      return {
        resource_type: "box",
        updated_count: 0,
        skipped_count: 0,
        details: { note: "no_boxes_found" },
      };
    }

    const existingAssignments = await tx.restaurant_box.findMany({
      where: {
        box_id: { in: boxIds },
        restaurant_id: destination_restaurant_id,
      },
      select: { box_id: true },
    });

    const alreadyAssigned = new Set(
      existingAssignments.map((a) => a.box_id),
    );

    const boxesToReactivate = await tx.box.findMany({
      where: {
        id: { in: boxIds },
        status: { not: "active" },
      },
      select: { id: true },
    });

    if (boxesToReactivate.length > 0) {
      await tx.box.updateMany({
        where: { id: { in: boxesToReactivate.map((b) => b.id) } },
        data: { status: "active" },
      });
    }

    await tx.restaurant_box.deleteMany({
      where: { box_id: { in: boxIds } },
    });

    const newAssignments = boxIds.map((box_id) => ({
      box_id,
      restaurant_id: destination_restaurant_id,
      status: "shared" as const,
    }));

    await tx.restaurant_box.createMany({
      data: newAssignments,
    });

    try {
      requireMongoDB("BoxConfig.updateMany");
      await BoxConfig.updateMany(
        { box_id: { $in: boxIds } },
        { $set: { restaurant_id: destination_restaurant_id } },
      );
    } catch (err) {
      logger.warn(
        `MongoDB BoxConfig update failed during box reassign: ${err}`,
      );
    }

    return {
      resource_type: "box",
      updated_count: boxIds.length,
      skipped_count: alreadyAssigned.size,
      details: {
        total_box_ids: boxIds.length,
        reactivated_count: boxesToReactivate.length,
      },
    };
  }

  async restoreResources(
    ctx: ResourceLifecycleContext,
    tx: TransactionClient,
  ): Promise<ResourceOperationResult> {
    const { restaurant_ids } = ctx;

    const boxIds = await this.getBoxIdsByRestaurants(restaurant_ids, tx);

    if (boxIds.length === 0) {
      return {
        resource_type: "box",
        updated_count: 0,
        skipped_count: 0,
        details: { note: "no_boxes_to_restore" },
      };
    }

    const boxes = await tx.box.findMany({
      where: { id: { in: boxIds }, status: "suspended" },
      select: { id: true },
    });

    if (boxes.length === 0) {
      return {
        resource_type: "box",
        updated_count: 0,
        skipped_count: 0,
        details: { note: "no_suspended_boxes_to_restore" },
      };
    }

    await tx.box.updateMany({
      where: { id: { in: boxes.map((b) => b.id) } },
      data: { status: "active" },
    });

    return {
      resource_type: "box",
      updated_count: boxes.length,
      skipped_count: 0,
    };
  }
}
