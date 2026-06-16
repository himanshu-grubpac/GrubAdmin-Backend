export type LifecycleAction = "suspend" | "assign";
export type ResourceState = "active" | "suspended" | "unassigned" | "reassigned";
export type ResourceType = "employee" | "box" | "restaurant";

export interface ResourceLifecycleContext {
  client_id: string;
  restaurant_ids: string[];
  action: LifecycleAction;
  destination_restaurant_id: string | null;
}

export interface ResourceOperationResult {
  resource_type: ResourceType;
  updated_count: number;
  skipped_count: number;
  details?: Record<string, unknown>;
}

export interface ResourceLifecycleService {
  readonly resourceType: ResourceType;

  suspendResources(
    ctx: ResourceLifecycleContext,
    tx: TransactionClient,
  ): Promise<ResourceOperationResult>;

  unassignResources(
    ctx: ResourceLifecycleContext,
    tx: TransactionClient,
  ): Promise<ResourceOperationResult>;

  reassignResources(
    ctx: ResourceLifecycleContext,
    tx: TransactionClient,
  ): Promise<ResourceOperationResult>;

  restoreResources(
    ctx: ResourceLifecycleContext,
    tx: TransactionClient,
  ): Promise<ResourceOperationResult>;
}

import type { Prisma } from "@/db/types";
import type { PrismaClient } from "@/db/prisma";

export type TransactionClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

export interface LifecycleLockResult {
  acquired: boolean;
  lock_id: string;
}
