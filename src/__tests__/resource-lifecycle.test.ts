import { describe, expect, test, mock } from "bun:test";

// ---------------------------------------------------------------------------
// Test Resource Lifecycle service behavior in isolation.
//
// We test the service interfaces directly by mocking Prisma transaction
// clients and verifying the correct queries are issued for each operation.
// ---------------------------------------------------------------------------

// === Fake transaction client that records all calls ===
function createFakeTx() {
  const calls: { method: string; args: unknown[] }[] = [];
  const record =
    (method: string) =>
    (...args: unknown[]) => {
      calls.push({ method, args });
      return Promise.resolve();
    };

  const findMany =
    (overrides?: Record<string, unknown[]>) =>
    (args: unknown) => {
      const key = JSON.stringify(args);
      const result = overrides?.[key] ?? [];
      calls.push({ method: "findMany", args: [args] });
      return Promise.resolve(result);
    };

  const fakeTx = {
    _calls: calls,
    _reset: () => (calls.length = 0),

    // Prisma models as fake objects with jest-like recording
    vertical_delivery_employee: {
      findMany: mock(() => Promise.resolve([])),
      updateMany: mock(() => Promise.resolve({ count: 0 })),
      update: mock(() => Promise.resolve({})),
      findFirst: mock(() => Promise.resolve(null)),
      count: mock(() => Promise.resolve(0)),
    },
    box: {
      findMany: mock(() => Promise.resolve([])),
      updateMany: mock(() => Promise.resolve({ count: 0 })),
    },
    restaurant_box: {
      findMany: mock(() => Promise.resolve([])),
      deleteMany: mock(() => Promise.resolve({ count: 0 })),
      createMany: mock(() => Promise.resolve({ count: 0 })),
    },
    vertical_delivery_employee_box: {
      deleteMany: mock(() => Promise.resolve({ count: 0 })),
    },
    restaurant: {
      findUnique: mock(() => Promise.resolve(null)),
      findMany: mock(() => Promise.resolve([])),
      updateMany: mock(() => Promise.resolve({ count: 0 })),
      deleteMany: mock(() => Promise.resolve({ count: 0 })),
    },
    restaurant_deleted: {
      createMany: mock(() => Promise.resolve({ count: 0 })),
    },
  };

  return fakeTx as any;
}

// === Mock MongoDB BoxConfig ===
mock.module("@/db/mongo-schema", () => ({
  BoxConfig: {
    updateMany: mock(() => Promise.resolve({ modifiedCount: 0 })),
  },
}));

// Mock db connection checks
mock.module("@/db", () => ({
  isMongoConnected: () => true,
  getMongoConnectionState: () => "connected",
}));

describe("EmployeeLifecycleService", () => {
  const { EmployeeLifecycleService } =
    require("@/services/resource-lifecycle/employee-lifecycle.service");

  test("suspendResources updates non-suspended employees", async () => {
    const service = new EmployeeLifecycleService();
    const tx = createFakeTx();

    tx.vertical_delivery_employee.findMany.mockResolvedValue([
      { id: "emp1", status: "active" },
      { id: "emp2", status: "suspended" },
      { id: "emp3", status: "unassigned" },
    ]);

    const result = await service.suspendResources(
      {
        client_id: "client1",
        restaurant_ids: ["rest1"],
        action: "suspend",
        destination_restaurant_id: null,
      },
      tx,
    );

    expect(result.updated_count).toBe(2);
    expect(result.skipped_count).toBe(1);
    expect(tx.vertical_delivery_employee.updateMany).toHaveBeenCalled();
    const updateCall = tx.vertical_delivery_employee.updateMany.mock.calls[0][0];
    expect(updateCall.data).toEqual({ status: "suspended" });
  });

  test("suspendResources skips all-already-suspended", async () => {
    const service = new EmployeeLifecycleService();
    const tx = createFakeTx();

    tx.vertical_delivery_employee.findMany.mockResolvedValue([
      { id: "emp1", status: "suspended" },
    ]);

    const result = await service.suspendResources(
      {
        client_id: "client1",
        restaurant_ids: ["rest1"],
        action: "suspend",
        destination_restaurant_id: null,
      },
      tx,
    );

    expect(result.updated_count).toBe(0);
    expect(result.skipped_count).toBe(1);
  });

  test("unassignResources sets restaurant_id and status", async () => {
    const service = new EmployeeLifecycleService();
    const tx = createFakeTx();

    tx.vertical_delivery_employee.findMany.mockResolvedValue([
      { id: "emp1", status: "active", restaurant_id: "rest1" },
    ]);

    const result = await service.unassignResources(
      {
        client_id: "client1",
        restaurant_ids: ["rest1"],
        action: "assign",
        destination_restaurant_id: null,
      },
      tx,
    );

    expect(result.updated_count).toBe(1);
    const updateCall = tx.vertical_delivery_employee.updateMany.mock.calls[0][0];
    expect(updateCall.data).toEqual({
      status: "unassigned",
      restaurant_id: null,
    });
  });

  test("reassignResources moves employees to destination", async () => {
    const service = new EmployeeLifecycleService();
    const tx = createFakeTx();

    tx.vertical_delivery_employee.findMany.mockResolvedValue([
      { id: "emp1", role: "delivery", restaurant_id: "rest1" },
      { id: "emp2", role: "delivery", restaurant_id: "rest1" },
    ]);

    const result = await service.reassignResources(
      {
        client_id: "client1",
        restaurant_ids: ["rest1"],
        action: "assign",
        destination_restaurant_id: "rest2",
      },
      tx,
    );

    expect(result.updated_count).toBe(2);
    const updateCall = tx.vertical_delivery_employee.updateMany.mock.calls[0][0];
    expect(updateCall.data).toEqual({ restaurant_id: "rest2" });
  });

  test("reassignResources handles manager conflict gracefully", async () => {
    const service = new EmployeeLifecycleService();
    const tx = createFakeTx();

    tx.vertical_delivery_employee.findMany.mockResolvedValue([
      { id: "mgr1", role: "manager", restaurant_id: "rest1" },
      { id: "del1", role: "delivery", restaurant_id: "rest1" },
    ]);

    tx.vertical_delivery_employee.findFirst.mockResolvedValue({
      id: "existingMgr",
      restaurant_id: "rest2",
    });

    const result = await service.reassignResources(
      {
        client_id: "client1",
        restaurant_ids: ["rest1"],
        action: "assign",
        destination_restaurant_id: "rest2",
      },
      tx,
    );

    expect(result.updated_count).toBe(1);
    expect(result.details?.reason).toBe("destination_already_has_manager");
  });
});

describe("BoxLifecycleService", () => {
  const { BoxLifecycleService } =
    require("@/services/resource-lifecycle/box-lifecycle.service");

  test("suspendResources sets box.status=suspended and preserves restaurant_box", async () => {
    const service = new BoxLifecycleService();
    const tx = createFakeTx();

    tx.restaurant_box.findMany.mockResolvedValue([
      { box_id: "box1" },
      { box_id: "box2" },
    ]);

    tx.box.findMany.mockResolvedValue([
      { id: "box1", status: "active" },
      { id: "box2", status: "suspended" },
    ]);

    const result = await service.suspendResources(
      {
        client_id: "client1",
        restaurant_ids: ["rest1"],
        action: "suspend",
        destination_restaurant_id: null,
      },
      tx,
    );

    expect(result.updated_count).toBe(1);
    expect(result.skipped_count).toBe(1);
    // restaurant_box.deleteMany should NOT be called (preserve association)
    expect(tx.restaurant_box.deleteMany).not.toHaveBeenCalled();

    // box.updateMany should set status to suspended
    expect(tx.box.updateMany).toHaveBeenCalled();
    const updateCall = tx.box.updateMany.mock.calls[0][0];
    expect(updateCall.data).toEqual({ status: "suspended" });
  });

  test("suspendResources does nothing when no boxes found", async () => {
    const service = new BoxLifecycleService();
    const tx = createFakeTx();

    tx.restaurant_box.findMany.mockResolvedValue([]);

    const result = await service.suspendResources(
      {
        client_id: "client1",
        restaurant_ids: ["rest1"],
        action: "suspend",
        destination_restaurant_id: null,
      },
      tx,
    );

    expect(result.updated_count).toBe(0);
    expect(result.details?.note).toBe("no_boxes_found");
  });

  test("unassignResources removes associations and sets unassigned", async () => {
    const service = new BoxLifecycleService();
    const tx = createFakeTx();

    tx.restaurant_box.findMany.mockResolvedValue([
      { box_id: "box1" },
    ]);

    tx.box.findMany.mockResolvedValue([
      { id: "box1", status: "active" },
    ]);

    const result = await service.unassignResources(
      {
        client_id: "client1",
        restaurant_ids: ["rest1"],
        action: "assign",
        destination_restaurant_id: null,
      },
      tx,
    );

    expect(tx.restaurant_box.deleteMany).toHaveBeenCalled();
    expect(tx.box.updateMany).toHaveBeenCalled();
    const updateCall = tx.box.updateMany.mock.calls[0][0];
    expect(updateCall.data).toEqual({ status: "unassigned" });
    expect(result.updated_count).toBeGreaterThan(0);
  });

  test("reassignResources moves boxes and sets active", async () => {
    const service = new BoxLifecycleService();
    const tx = createFakeTx();

    tx.restaurant_box.findMany.mockResolvedValue([
      { box_id: "box1" },
    ]);

    tx.restaurant_box.findMany
      .mockResolvedValueOnce([{ box_id: "box1" }]) // first call: getBoxIdsByRestaurants
      .mockResolvedValueOnce([]); // second call: existingAssignments

    tx.box.findMany.mockResolvedValue([
      { id: "box1", status: "suspended" },
    ]);

    // Override to support chained mock returns
    // The implementation calls restaurant_box.findMany twice
    // We need to handle this correctly with mock implementations

    const result = await service.reassignResources(
      {
        client_id: "client1",
        restaurant_ids: ["rest1"],
        action: "assign",
        destination_restaurant_id: "rest2",
      },
      tx,
    );

    expect(tx.restaurant_box.deleteMany).toHaveBeenCalled();
    expect(tx.restaurant_box.createMany).toHaveBeenCalled();
    expect(result.updated_count).toBe(1);
  });
});

describe("Resource lifecycle - edge cases", () => {
  const { EmployeeLifecycleService } =
    require("@/services/resource-lifecycle/employee-lifecycle.service");
  const { BoxLifecycleService } =
    require("@/services/resource-lifecycle/box-lifecycle.service");

  test("employee service handles empty restaurant gracefully", async () => {
    const service = new EmployeeLifecycleService();
    const tx = createFakeTx();

    tx.vertical_delivery_employee.findMany.mockResolvedValue([]);

    const result = await service.suspendResources(
      { client_id: "c1", restaurant_ids: ["empty_rest"], action: "suspend", destination_restaurant_id: null },
      tx,
    );

    expect(result.updated_count).toBe(0);
    expect(result.skipped_count).toBe(0);
  });

  test("box service handles already-unassigned boxes", async () => {
    const service = new BoxLifecycleService();
    const tx = createFakeTx();

    tx.restaurant_box.findMany.mockResolvedValue([{ box_id: "box1" }]);
    tx.box.findMany.mockResolvedValue([{ id: "box1", status: "unassigned" }]);

    const result = await service.unassignResources(
      { client_id: "c1", restaurant_ids: ["rest1"], action: "assign", destination_restaurant_id: null },
      tx,
    );

    expect(result.updated_count).toBe(1); // restaurant_box.delete counts as update
  });

  test("employee unassign skips already unassigned employees", async () => {
    const service = new EmployeeLifecycleService();
    const tx = createFakeTx();

    tx.vertical_delivery_employee.findMany.mockResolvedValue([
      { id: "emp1", status: "unassigned", restaurant_id: null },
    ]);

    const result = await service.unassignResources(
      { client_id: "c1", restaurant_ids: ["rest1"], action: "assign", destination_restaurant_id: null },
      tx,
    );

    expect(result.updated_count).toBe(0);
    expect(result.skipped_count).toBe(1);
  });

  test("employee reassign with null destination falls back to unassign", async () => {
    const service = new EmployeeLifecycleService();
    const tx = createFakeTx();

    tx.vertical_delivery_employee.findMany.mockResolvedValue([
      { id: "emp1", status: "active", restaurant_id: "rest1" },
    ]);

    const result = await service.reassignResources(
      { client_id: "c1", restaurant_ids: ["rest1"], action: "assign", destination_restaurant_id: null },
      tx,
    );

    expect(tx.vertical_delivery_employee.updateMany).toHaveBeenCalled();
    const call = tx.vertical_delivery_employee.updateMany.mock.calls[0][0];
    expect(call.data.restaurant_id).toBeNull();
    expect(call.data.status).toBe("unassigned");
    expect(result.updated_count).toBe(1);
  });

  test("employee restore handles already-active employees", async () => {
    const service = new EmployeeLifecycleService();
    const tx = createFakeTx();

    tx.vertical_delivery_employee.findMany.mockResolvedValue([]);

    const result = await service.restoreResources(
      { client_id: "c1", restaurant_ids: ["rest1"], action: "suspend", destination_restaurant_id: null },
      tx,
    );

    expect(result.updated_count).toBe(0);
  });

  test("box restore handles no suspended boxes", async () => {
    const service = new BoxLifecycleService();
    const tx = createFakeTx();

    tx.restaurant_box.findMany.mockResolvedValue([{ box_id: "box1" }]);
    tx.box.findMany.mockResolvedValue([]);

    const result = await service.restoreResources(
      { client_id: "c1", restaurant_ids: ["rest1"], action: "suspend", destination_restaurant_id: null },
      tx,
    );

    expect(result.updated_count).toBe(0);
  });
});
