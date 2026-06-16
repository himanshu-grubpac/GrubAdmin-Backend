import { APIError } from "@/types/error";
import { prisma, isMongoConnected, getMongoConnectionState } from "@/db";
import { logger } from "@/utils/logger";
import { BoxConfig } from "@/db/mongo-schema";
import type {
  ResourceLifecycleContext,
  ResourceLifecycleService,
  ResourceOperationResult,
  TransactionClient,
} from "./types";
import { EmployeeLifecycleService } from "./employee-lifecycle.service";
import { BoxLifecycleService } from "./box-lifecycle.service";

type LockResult = {
  acquired: boolean;
  lock_ids: string[];
};

export class RestaurantLifecycleService {
  private services: Map<string, ResourceLifecycleService> = new Map();
  private lockNamespace = "restaurant:lifecycle";

  constructor() {
    this.register(new EmployeeLifecycleService());
    this.register(new BoxLifecycleService());
  }

  register(service: ResourceLifecycleService): void {
    this.services.set(service.resourceType, service);
  }

  getService(resourceType: string): ResourceLifecycleService | undefined {
    return this.services.get(resourceType);
  }

  private async acquireLocks(
    restaurant_ids: string[],
    tx: TransactionClient,
  ): Promise<LockResult> {
    const lock_ids: string[] = [];

    for (const id of restaurant_ids) {
      const lockId = `${this.lockNamespace}:${id}`;
      try {
        const existing = await tx.restaurant.findUnique({
          where: { id },
          select: { id: true, status: true },
        });
        if (existing) {
          lock_ids.push(id);
        }
      } catch {
        throw new APIError(
          `Failed to acquire lock for restaurant ${id}`,
          undefined,
          undefined,
          409,
        );
      }
    }

    return {
      acquired: lock_ids.length === restaurant_ids.length,
      lock_ids,
    };
  }

  private validateContext(ctx: ResourceLifecycleContext): void {
    if (ctx.restaurant_ids.length === 0) {
      throw new APIError(
        "At least one restaurant ID is required",
        undefined,
        undefined,
        400,
      );
    }
    if (ctx.action === "assign" && ctx.destination_restaurant_id) {
      if (ctx.restaurant_ids.includes(ctx.destination_restaurant_id)) {
        throw new APIError(
          "Self-reassignment target is not allowed",
          undefined,
          undefined,
          400,
        );
      }
    }
  }

  async suspendWithResources(ctx: ResourceLifecycleContext): Promise<{
    restaurant_results: ResourceOperationResult;
    resource_results: ResourceOperationResult[];
  }> {
    this.validateContext(ctx);

    const { client_id, restaurant_ids, action, destination_restaurant_id } =
      ctx;

    return prisma.$transaction(async (tx) => {
      const lock = await this.acquireLocks(restaurant_ids, tx);
      if (!lock.acquired) {
        throw new APIError(
          "Could not acquire lock on all target restaurants",
          "delivery.restaurant.lifecycle.LOCK_FAILED",
          { restaurant_ids, locked: lock.lock_ids },
          409,
        );
      }

      const restaurants = await tx.restaurant.findMany({
        where: { id: { in: restaurant_ids }, client_id },
        select: { id: true, status: true },
      });

      if (restaurants.length === 0) {
        throw new APIError(
          undefined,
          "delivery.restaurant.resource.NOT_FOUND",
          { ids: restaurant_ids },
          404,
        );
      }

      if (restaurants.length !== restaurant_ids.length) {
        throw new APIError(
          undefined,
          "delivery.restaurant.resource.PARTIAL_FOUND",
          {
            requested_ids: restaurant_ids,
            found_count: restaurants.length,
          },
          409,
        );
      }

      const alreadySuspended = restaurants.filter(
        (r) => r.status === "suspended",
      );
      const toSuspend = restaurants.filter((r) => r.status !== "suspended");

      if (toSuspend.length === 0 && action === "suspend") {
        throw new APIError(
          undefined,
          "delivery.common.ALREADY_IN_STATE",
          { ids: restaurant_ids, state: "suspended" },
          409,
        );
      }

      if (destination_restaurant_id) {
        const destRestaurant = await tx.restaurant.findUnique({
          where: {
            id: destination_restaurant_id,
            client_id,
          },
          select: { id: true, status: true },
        });

        if (!destRestaurant) {
          throw new APIError(
            undefined,
            "delivery.restaurant.resource.NOT_FOUND",
            { id: destination_restaurant_id },
            404,
          );
        }
      }

      const suspendableIds =
        toSuspend.length > 0
          ? toSuspend.map((r) => r.id)
          : restaurant_ids;

      const resourceCtx: ResourceLifecycleContext = {
        client_id,
        restaurant_ids: suspendableIds,
        action,
        destination_restaurant_id,
      };

      if (toSuspend.length > 0) {
        await tx.restaurant.updateMany({
          where: { id: { in: toSuspend.map((r) => r.id) } },
          data: { status: "suspended" },
        });
      }

      const resourceResults: ResourceOperationResult[] = [];

      if (action === "suspend") {
        for (const [, service] of this.services) {
          const result = await service.suspendResources(resourceCtx, tx);
          resourceResults.push(result);
        }
      } else if (action === "assign") {
        if (destination_restaurant_id) {
          for (const [, service] of this.services) {
            const result = await service.reassignResources(resourceCtx, tx);
            resourceResults.push(result);
          }
        } else {
          for (const [, service] of this.services) {
            const result = await service.unassignResources(resourceCtx, tx);
            resourceResults.push(result);
          }
        }
      }

      return {
        restaurant_results: {
          resource_type: "restaurant",
          updated_count: toSuspend.length,
          skipped_count: alreadySuspended.length,
        },
        resource_results: resourceResults,
      };
    });
  }

  async reactivateWithResources(
    ids: string[],
    client_id: string,
    reactivate_employees: boolean,
    reactivate_boxes: boolean,
  ): Promise<{
    restaurant_results: ResourceOperationResult;
    resource_results: ResourceOperationResult[];
  }> {
    return prisma.$transaction(async (tx) => {
      const restaurants = await tx.restaurant.findMany({
        where: { id: { in: ids }, client_id, status: "suspended" },
        select: { id: true },
      });

      if (restaurants.length === 0) {
        throw new APIError(
          "No suspended restaurants found to reactivate",
          undefined,
          { ids },
          404,
        );
      }

      const restaurantIds = restaurants.map((r) => r.id);

      await tx.restaurant.updateMany({
        where: { id: { in: restaurantIds }, client_id },
        data: { status: "active" },
      });

      const resourceResults: ResourceOperationResult[] = [];

      if (reactivate_employees) {
        const empService = this.services.get("employee");
        if (empService) {
          const result = await empService.restoreResources(
            {
              client_id,
              restaurant_ids: restaurantIds,
              action: "suspend",
              destination_restaurant_id: null,
            },
            tx,
          );
          resourceResults.push(result);
        }
      }

      if (reactivate_boxes) {
        const boxService = this.services.get("box");
        if (boxService) {
          const result = await boxService.restoreResources(
            {
              client_id,
              restaurant_ids: restaurantIds,
              action: "suspend",
              destination_restaurant_id: null,
            },
            tx,
          );
          resourceResults.push(result);
        }
      }

      return {
        restaurant_results: {
          resource_type: "restaurant",
          updated_count: restaurantIds.length,
          skipped_count: 0,
        },
        resource_results: resourceResults,
      };
    });
  }

  async deleteWithResources(
    ids: string[],
    client_id: string,
    destination_restaurant_id: string | null,
  ): Promise<{
    deleted_count: number;
    deleted_restaurant_ids: string[];
    affected_box_ids: string[];
    affected_employee_count: number;
  }> {
    return prisma.$transaction(async (tx) => {
      const lock = await this.acquireLocks(ids, tx);
      if (!lock.acquired) {
        throw new APIError(
          "Could not acquire lock on all target restaurants",
          "delivery.restaurant.lifecycle.LOCK_FAILED",
          { restaurant_ids: ids, locked: lock.lock_ids },
          409,
        );
      }

      const restaurants = await tx.restaurant.findMany({
        where: { id: { in: ids }, client_id },
        include: {
          restaurant_boxes: true,
          client: true,
        },
      });

      if (restaurants.length === 0) {
        throw new APIError(
          undefined,
          "delivery.restaurant.resource.NOT_FOUND",
          { ids },
          404,
        );
      }

      if (restaurants.length !== ids.length) {
        throw new APIError(
          undefined,
          "delivery.restaurant.resource.PARTIAL_FOUND",
          {
            requested_ids: ids,
            found_count: restaurants.length,
          },
          409,
        );
      }

      if (destination_restaurant_id) {
        if (ids.includes(destination_restaurant_id)) {
          throw new APIError(
            "Self-reassignment target is not allowed",
            undefined,
            undefined,
            400,
          );
        }

        const destRestaurant = await tx.restaurant.findUnique({
          where: { id: destination_restaurant_id, client_id },
          select: { id: true, status: true },
        });

        if (!destRestaurant) {
          throw new APIError(
            undefined,
            "delivery.restaurant.resource.NOT_FOUND",
            { id: destination_restaurant_id },
            404,
          );
        }
      }

      const managers = await tx.vertical_delivery_employee.findMany({
        where: {
          restaurant_id: { in: ids },
          role: "manager",
          status: { not: "suspended" },
        },
      });

      const boxIds = restaurants.flatMap((r) =>
        r.restaurant_boxes.map((rb) => rb.box_id),
      );

      const activeEmployeeCount =
        await tx.vertical_delivery_employee.count({
          where: {
            restaurant_id: { in: ids },
            client_id,
            status: { not: "suspended" },
          },
        });

      const activeBoxIdsResult = boxIds.length > 0
        ? await tx.box.findMany({
            where: {
              id: { in: boxIds },
              status: { not: "suspended" },
            },
            select: { id: true },
          })
        : [];

      if (
        (activeBoxIdsResult.length > 0 || activeEmployeeCount > 0) &&
        !destination_restaurant_id
      ) {
        throw new APIError(
          "Cannot delete restaurant(s) with active resources (employees/boxes) assigned unless a destination restaurant is provided for reassignment.",
          "delivery.restaurant.delete.ACTIVE_DEPENDENCIES",
          {
            box_count: activeBoxIdsResult.length,
            employee_count: activeEmployeeCount,
          },
          409,
        );
      }

      const resourceCtx: ResourceLifecycleContext = {
        client_id,
        restaurant_ids: ids,
        action: destination_restaurant_id ? "assign" : "assign",
        destination_restaurant_id,
      };

      await tx.restaurant_deleted.createMany({
        data: restaurants.map((r) => {
          const manager = managers.find((m) => m.restaurant_id === r.id);
          return {
            id: r.id,
            name: r.name,
            client_id: r.client_id,
            client_name: r.client?.name ?? "",
            manager_id: manager?.id || null,
            manager_name: manager
              ? `${manager.first_name} ${manager.last_name}`
              : "",
            city: r.city,
            google_place_id: r.google_place_id,
            latitude: r.latitude,
            line_one: r.line_one,
            line_two: r.line_two,
            longitude: r.longitude,
            pincode: r.pincode,
            state: r.state,
            x_primary_key: r.id,
          };
        }),
      });

      if (destination_restaurant_id) {
        const boxService = this.services.get("box");
        if (boxService && boxIds.length > 0) {
          await boxService.reassignResources(resourceCtx, tx);
        }

        const empService = this.services.get("employee");
        if (empService) {
          await empService.reassignResources(resourceCtx, tx);
        }
      } else {
        if (boxIds.length > 0) {
          await tx.restaurant_box.deleteMany({
            where: { restaurant_id: { in: ids } },
          });

          const suspendedBoxIdsResult = await tx.box.findMany({
            where: { id: { in: boxIds }, status: "suspended" },
            select: { id: true },
          });

          if (suspendedBoxIdsResult.length > 0) {
            await tx.box.updateMany({
              where: { id: { in: suspendedBoxIdsResult.map((b) => b.id) } },
              data: { status: "unassigned" as any },
            });
          }
        }

        await tx.vertical_delivery_employee.updateMany({
          where: {
            restaurant_id: { in: ids },
            client_id,
            status: "suspended",
          },
          data: { restaurant_id: null },
        });

        await tx.vertical_delivery_employee.updateMany({
          where: {
            restaurant_id: { in: ids },
            client_id,
            status: { not: "suspended" },
          },
          data: { restaurant_id: null, status: "unassigned" },
        });

        if (boxIds.length > 0) {
          try {
            requireMongoDB("BoxConfig.updateMany");
            await BoxConfig.updateMany(
              { box_id: { $in: boxIds } },
              { $set: { driver_id: null, restaurant_id: null } },
            );
          } catch (err) {
            logger.warn(
              `MongoDB BoxConfig update failed during delete: ${err}`,
            );
          }

          await tx.vertical_delivery_employee_box.deleteMany({
            where: { box_id: { in: boxIds } },
          });
        }
      }

      await tx.restaurant.deleteMany({
        where: { id: { in: ids }, client_id },
      });

      return {
        deleted_count: restaurants.length,
        deleted_restaurant_ids: ids,
        affected_box_ids: boxIds,
        affected_employee_count: activeEmployeeCount,
      };
    });
  }
}

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
