import { APIError } from "@/types/error";
import { prisma, isMongoConnected, getMongoConnectionState } from "@/db";
import { logger } from "@/utils/logger";
import { BoxConfig } from "@/db/mongo-schema";
import type {
  ResourceOperationResult,
  TransactionClient,
} from "./types";

type LockResult = {
  acquired: boolean;
  lock_ids: string[];
};

export class DepartmentLifecycleService {
  private lockNamespace = "department:lifecycle";

  private async acquireLocks(
    department_ids: string[],
    tx: TransactionClient,
  ): Promise<LockResult> {
    const lock_ids: string[] = [];

    for (const id of department_ids) {
      try {
        const existing = await tx.vertical_medical_department.findUnique({
          where: { id },
          select: { id: true, status: true },
        });
        if (existing) {
          lock_ids.push(id);
        }
      } catch {
        throw new APIError(
          `Failed to acquire lock for department ${id}`,
          undefined,
          undefined,
          409,
        );
      }
    }

    return {
      acquired: lock_ids.length === department_ids.length,
      lock_ids,
    };
  }

  async suspendWithResources(ctx: any): Promise<{
    department_results: ResourceOperationResult;
  }> {
    const { client_id, department_ids, action, destination_department_id } = ctx;

    return prisma.$transaction(async (tx) => {
      const lock = await this.acquireLocks(department_ids, tx);
      if (!lock.acquired) {
        throw new APIError(
          "Could not acquire lock on all target departments",
          "medical.department.lifecycle.LOCK_FAILED",
          { department_ids, locked: lock.lock_ids },
          409,
        );
      }

      const departments = await tx.vertical_medical_department.findMany({
        where: { id: { in: department_ids }, client_id },
        select: { id: true, status: true },
      });

      if (departments.length === 0) {
        throw new APIError(
          undefined,
          "medical.department.resource.NOT_FOUND",
          { ids: department_ids },
          404,
        );
      }

      if (departments.length !== department_ids.length) {
        throw new APIError(
          undefined,
          "medical.department.resource.PARTIAL_FOUND",
          { requested_ids: department_ids, found_count: departments.length },
          409,
        );
      }

      const alreadySuspended = departments.filter((r) => r.status === "suspended");
      const toSuspend = departments.filter((r) => r.status !== "suspended");

      if (toSuspend.length === 0 && action === "suspend") {
        throw new APIError(
          undefined,
          "medical.common.ALREADY_IN_STATE",
          { ids: department_ids, state: "suspended" },
          409,
        );
      }

      if (destination_department_id) {
        const destDepartment = await tx.vertical_medical_department.findUnique({
          where: { id: destination_department_id, client_id },
          select: { id: true, status: true },
        });

        if (!destDepartment) {
          throw new APIError(
            undefined,
            "medical.department.resource.NOT_FOUND",
            { id: destination_department_id },
            404,
          );
        }
      }

      const suspendableIds = toSuspend.length > 0
        ? toSuspend.map((r) => r.id)
        : department_ids;

      if (toSuspend.length > 0) {
        await tx.vertical_medical_department.updateMany({
          where: { id: { in: toSuspend.map((r) => r.id) } },
          data: { status: "suspended" },
        });
      }

      if (action === "suspend") {
        await tx.vertical_medical_employee.updateMany({
          where: { department_id: { in: suspendableIds }, client_id, status: { not: "suspended" } },
          data: { status: "suspended" },
        });

        const boxIds = await this.getDepartmentBoxIds(suspendableIds, tx);
        if (boxIds.length > 0) {
          await tx.box.updateMany({
            where: { id: { in: boxIds }, status: { not: "suspended" } },
            data: { status: "suspended" },
          });
        }
      } else if (action === "assign") {
        if (destination_department_id) {
          await tx.vertical_medical_employee.updateMany({
            where: { department_id: { in: suspendableIds }, client_id },
            data: { department_id: destination_department_id },
          });

          const boxIds = await this.getDepartmentBoxIds(suspendableIds, tx);
          if (boxIds.length > 0) {
            await tx.vertical_medical_department_box.deleteMany({
              where: { box_id: { in: boxIds } },
            });
            await tx.vertical_medical_department_box.createMany({
              data: boxIds.map((box_id: string) => ({
                box_id,
                department_id: destination_department_id,
                status: "shared",
              })),
            });
          }
        } else {
          await tx.vertical_medical_employee.updateMany({
            where: { department_id: { in: suspendableIds }, client_id },
            data: { department_id: null, status: "unassigned" },
          });

          const boxIds = await this.getDepartmentBoxIds(suspendableIds, tx);
          if (boxIds.length > 0) {
            await tx.vertical_medical_department_box.deleteMany({
              where: { box_id: { in: boxIds } },
            });
            await tx.vertical_medical_employee_box.deleteMany({
              where: { box_id: { in: boxIds } },
            });
            await tx.box.updateMany({
              where: { id: { in: boxIds }, status: { not: "suspended" } },
              data: { status: "unassigned" as any },
            });
          }
        }
      }

      return {
        department_results: {
          resource_type: "department" as any,
          updated_count: toSuspend.length,
          skipped_count: alreadySuspended.length,
        },
      };
    });
  }

  async reactivateWithResources(
    ids: string[],
    client_id: string,
    reactivate_employees: boolean,
    reactivate_boxes: boolean,
  ): Promise<{
    department_results: ResourceOperationResult;
  }> {
    return prisma.$transaction(async (tx) => {
      const departments = await tx.vertical_medical_department.findMany({
        where: { id: { in: ids }, client_id, status: "suspended" },
        select: { id: true },
      });

      if (departments.length === 0) {
        throw new APIError(
          "No suspended departments found to reactivate",
          undefined,
          { ids },
          404,
        );
      }

      const departmentIds = departments.map((r) => r.id);

      await tx.vertical_medical_department.updateMany({
        where: { id: { in: departmentIds }, client_id },
        data: { status: "active" },
      });

      if (reactivate_employees) {
        await tx.vertical_medical_employee.updateMany({
          where: { department_id: { in: departmentIds }, client_id, status: "suspended" },
          data: { status: "active" },
        });
      }

      if (reactivate_boxes) {
        const boxIds = await this.getDepartmentBoxIds(departmentIds, tx);
        if (boxIds.length > 0) {
          await tx.box.updateMany({
            where: { id: { in: boxIds }, status: "suspended" },
            data: { status: "active" },
          });
        }
      }

      return {
        department_results: {
          resource_type: "department" as any,
          updated_count: departmentIds.length,
          skipped_count: 0,
        },
      };
    });
  }

  async deleteWithResources(
    ids: string[],
    client_id: string,
    destination_department_id: string | null,
  ): Promise<{
    deleted_count: number;
    deleted_department_ids: string[];
    affected_box_ids: string[];
    affected_employee_count: number;
  }> {
    return prisma.$transaction(async (tx) => {
      const lock = await this.acquireLocks(ids, tx);
      if (!lock.acquired) {
        throw new APIError(
          "Could not acquire lock on all target departments",
          "medical.department.lifecycle.LOCK_FAILED",
          { department_ids: ids, locked: lock.lock_ids },
          409,
        );
      }

      const departments = await tx.vertical_medical_department.findMany({
        where: { id: { in: ids }, client_id },
        include: { department_boxes: true, client: true },
      });

      if (departments.length === 0) {
        throw new APIError(undefined, "medical.department.resource.NOT_FOUND", { ids }, 404);
      }

      if (departments.length !== ids.length) {
        throw new APIError(undefined, "medical.department.resource.PARTIAL_FOUND", {
          requested_ids: ids, found_count: departments.length,
        }, 409);
      }

      if (destination_department_id) {
        if (ids.includes(destination_department_id)) {
          throw new APIError("Self-reassignment target is not allowed", undefined, undefined, 400);
        }
        const destDepartment = await tx.vertical_medical_department.findUnique({
          where: { id: destination_department_id, client_id },
          select: { id: true, status: true },
        });
        if (!destDepartment) {
          throw new APIError(undefined, "medical.department.resource.NOT_FOUND", { id: destination_department_id }, 404);
        }
      }

      const boxIds = departments.flatMap((r: any) =>
        r.department_boxes.map((db: any) => db.box_id),
      );

      const activeEmployeeCount = await tx.vertical_medical_employee.count({
        where: { department_id: { in: ids }, client_id, status: { not: "suspended" } },
      });

      const activeBoxIdsResult = boxIds.length > 0
        ? await tx.box.findMany({
            where: { id: { in: boxIds }, status: { not: "suspended" } },
            select: { id: true },
          })
        : [];

      if ((activeBoxIdsResult.length > 0 || activeEmployeeCount > 0) && !destination_department_id) {
        throw new APIError(
          "Cannot delete department(s) with active resources unless a destination department is provided.",
          "medical.department.delete.ACTIVE_DEPENDENCIES",
          { box_count: activeBoxIdsResult.length, employee_count: activeEmployeeCount },
          409,
        );
      }

      await tx.vertical_medical_department_deleted.createMany({
        data: departments.map((r: any) => ({
          name: r.name,
          client_id: r.client_id,
          client_name: r.client?.name ?? "",
          x_primary_key: r.id,
        })),
      });

      if (destination_department_id) {
        await tx.vertical_medical_employee.updateMany({
          where: { department_id: { in: ids }, client_id },
          data: { department_id: destination_department_id },
        });

        if (boxIds.length > 0) {
          await tx.vertical_medical_department_box.deleteMany({
            where: { department_id: { in: ids } },
          });
          await tx.vertical_medical_department_box.createMany({
            data: boxIds.map((box_id: string) => ({
              box_id,
              department_id: destination_department_id,
              status: "shared",
            })),
          });
        }
      } else {
        if (boxIds.length > 0) {
          await tx.vertical_medical_department_box.deleteMany({
            where: { department_id: { in: ids } },
          });

          await tx.vertical_medical_employee_box.deleteMany({
            where: { box_id: { in: boxIds } },
          });

          const suspendedBoxIdsResult = await tx.box.findMany({
            where: { id: { in: boxIds }, status: "suspended" },
            select: { id: true },
          });
          if (suspendedBoxIdsResult.length > 0) {
            await tx.box.updateMany({
              where: { id: { in: suspendedBoxIdsResult.map((b: any) => b.id) } },
              data: { status: "unassigned" as any },
            });
          }
        }

        await tx.vertical_medical_employee.updateMany({
          where: { department_id: { in: ids }, client_id },
          data: { department_id: null, status: "unassigned" },
        });
      }

      await tx.vertical_medical_department.deleteMany({
        where: { id: { in: ids }, client_id },
      });

      return {
        deleted_count: departments.length,
        deleted_department_ids: ids,
        affected_box_ids: boxIds,
        affected_employee_count: activeEmployeeCount,
      };
    });
  }

  private async getDepartmentBoxIds(
    department_ids: string[],
    tx: TransactionClient,
  ): Promise<string[]> {
    const dbs = await tx.vertical_medical_department_box.findMany({
      where: { department_id: { in: department_ids } },
      select: { box_id: true },
    });
    return [...new Set(dbs.map((db: any) => db.box_id))];
  }
}
