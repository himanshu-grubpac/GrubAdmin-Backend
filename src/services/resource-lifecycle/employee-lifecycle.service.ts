import { APIError } from "@/types/error";
import type {
  ResourceLifecycleService,
  ResourceLifecycleContext,
  ResourceOperationResult,
  TransactionClient,
} from "./types";

export class EmployeeLifecycleService implements ResourceLifecycleService {
  readonly resourceType = "employee" as const;

  async suspendResources(
    ctx: ResourceLifecycleContext,
    tx: TransactionClient,
  ): Promise<ResourceOperationResult> {
    const { client_id, restaurant_ids } = ctx;

    const employees = await tx.vertical_delivery_employee.findMany({
      where: {
        restaurant_id: { in: restaurant_ids },
        client_id,
      },
      select: { id: true, status: true },
    });

    const alreadySuspended = employees.filter((e) => e.status === "suspended");
    const toUpdate = employees.filter((e) => e.status !== "suspended");

    if (toUpdate.length > 0) {
      await tx.vertical_delivery_employee.updateMany({
        where: { id: { in: toUpdate.map((e) => e.id) } },
        data: { status: "suspended" },
      });
    }

    return {
      resource_type: "employee",
      updated_count: toUpdate.length,
      skipped_count: alreadySuspended.length,
    };
  }

  async unassignResources(
    ctx: ResourceLifecycleContext,
    tx: TransactionClient,
  ): Promise<ResourceOperationResult> {
    const { client_id, restaurant_ids } = ctx;

    const employees = await tx.vertical_delivery_employee.findMany({
      where: {
        restaurant_id: { in: restaurant_ids },
        client_id,
      },
      select: { id: true, status: true, restaurant_id: true },
    });

    const alreadyUnassigned = employees.filter(
      (e) => e.status === "unassigned" && e.restaurant_id === null,
    );
    const toUpdate = employees.filter(
      (e) => e.restaurant_id !== null || e.status !== "unassigned",
    );

    if (toUpdate.length > 0) {
      await tx.vertical_delivery_employee.updateMany({
        where: { id: { in: toUpdate.map((e) => e.id) } },
        data: { status: "unassigned", restaurant_id: null },
      });
    }

    return {
      resource_type: "employee",
      updated_count: toUpdate.length,
      skipped_count: alreadyUnassigned.length,
    };
  }

  async reassignResources(
    ctx: ResourceLifecycleContext,
    tx: TransactionClient,
  ): Promise<ResourceOperationResult> {
    const { client_id, restaurant_ids, destination_restaurant_id } = ctx;

    if (!destination_restaurant_id) {
      return this.unassignResources(ctx, tx);
    }

    const employees = await tx.vertical_delivery_employee.findMany({
      where: {
        restaurant_id: { in: restaurant_ids },
        client_id,
      },
    });

    const alreadyAtDestination = employees.filter(
      (e) => e.restaurant_id === destination_restaurant_id,
    );
    const toMove = employees.filter(
      (e) => e.restaurant_id !== destination_restaurant_id,
    );

    if (toMove.length === 0) {
      return {
        resource_type: "employee",
        updated_count: 0,
        skipped_count: alreadyAtDestination.length,
      };
    }

    const managersToMove = toMove.filter((e) => e.role === "manager");
    if (managersToMove.length > 0) {
      const existingManager = await tx.vertical_delivery_employee.findFirst({
        where: {
          restaurant_id: destination_restaurant_id,
          role: "manager",
        },
      });

      if (existingManager && managersToMove.length > 0) {
        const managerToKeepId = existingManager.id;
        const managersToUnassign = managersToMove.filter(
          (m) => m.id !== managerToKeepId,
        );

        if (managersToUnassign.length > 0) {
          await tx.vertical_delivery_employee.updateMany({
            where: { id: { in: managersToUnassign.map((m) => m.id) } },
            data: { restaurant_id: null },
          });
        }

        const nonManagerEmployees = toMove.filter((e) => e.role !== "manager");
        if (nonManagerEmployees.length > 0) {
          await tx.vertical_delivery_employee.updateMany({
            where: { id: { in: nonManagerEmployees.map((e) => e.id) } },
            data: { restaurant_id: destination_restaurant_id },
          });
        }

        return {
          resource_type: "employee",
          updated_count:
            nonManagerEmployees.length +
            (managersToMove.length > 0 && existingManager
              ? 0
              : managersToMove.length),
          skipped_count:
            alreadyAtDestination.length + managersToUnassign.length,
          details: {
            skipped_manager_ids: managersToUnassign.map((m) => m.id),
            reason: "destination_already_has_manager",
          },
        };
      }
    }

    if (toMove.length > 0) {
      await tx.vertical_delivery_employee.updateMany({
        where: { id: { in: toMove.map((e) => e.id) } },
        data: { restaurant_id: destination_restaurant_id },
      });
    }

    return {
      resource_type: "employee",
      updated_count: toMove.length,
      skipped_count: alreadyAtDestination.length,
    };
  }

  async restoreResources(
    ctx: ResourceLifecycleContext,
    tx: TransactionClient,
  ): Promise<ResourceOperationResult> {
    const { client_id, restaurant_ids } = ctx;

    const employees = await tx.vertical_delivery_employee.findMany({
      where: {
        restaurant_id: { in: restaurant_ids },
        client_id,
        status: "suspended",
      },
      select: { id: true, status: true, role: true, restaurant_id: true },
      orderBy: { created_at: "asc" },
    });

    if (employees.length === 0) {
      return {
        resource_type: "employee",
        updated_count: 0,
        skipped_count: 0,
      };
    }

    const nonManagers = employees.filter((e) => e.role !== "manager");
    const managers = employees.filter((e) => e.role === "manager");

    // Batch restore non-managers to active
    if (nonManagers.length > 0) {
      await tx.vertical_delivery_employee.updateMany({
        where: { id: { in: nonManagers.map((e) => e.id) } },
        data: { status: "active" },
      });
    }

    // Batch manager conflict detection
    const activateIds: string[] = [];
    const unassignIds: string[] = [];

    if (managers.length > 0) {
      const mgrRestaurantIds: string[] = [
        ...new Set(
          managers
            .map((m) => m.restaurant_id)
            .filter((id): id is string => id !== null),
        ),
      ];

      // Find restaurants that already have an active manager (the suspended ones being
      // restored won't match since they have status="suspended")
      const existingManagers = await tx.vertical_delivery_employee.findMany({
        where: {
          restaurant_id: { in: mgrRestaurantIds },
          role: "manager",
          status: "active",
        },
        select: { restaurant_id: true },
      });
      const restaurantsWithManager = new Set(
        existingManagers.map((m) => m.restaurant_id),
      );

      // Group managers by restaurant (already ordered by created_at asc)
      const mgrByRestaurant = new Map<string, typeof managers>();
      for (const m of managers) {
        if (!m.restaurant_id) continue;
        const group = mgrByRestaurant.get(m.restaurant_id) || [];
        group.push(m);
        mgrByRestaurant.set(m.restaurant_id, group);
      }

      for (const [, group] of mgrByRestaurant) {
        const restaurantId = group[0]!.restaurant_id as string;
        if (restaurantsWithManager.has(restaurantId)) {
          // External conflict — all managers from this restaurant get unassigned
          for (const m of group) unassignIds.push(m.id);
        } else {
          // First (oldest by created_at) keeps role, rest get unassigned
          group.forEach((m, idx) => {
            if (idx === 0) activateIds.push(m.id);
            else unassignIds.push(m.id);
          });
        }
      }
    }

    if (activateIds.length > 0) {
      await tx.vertical_delivery_employee.updateMany({
        where: { id: { in: activateIds } },
        data: { status: "active" },
      });
    }

    if (unassignIds.length > 0) {
      await tx.vertical_delivery_employee.updateMany({
        where: { id: { in: unassignIds } },
        data: { status: "unassigned", restaurant_id: null },
      });
    }

    return {
      resource_type: "employee",
      updated_count: employees.length,
      skipped_count: 0,
    };
  }
}
