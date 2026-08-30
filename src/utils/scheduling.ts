import solver, { LpModel } from 'javascript-lp-solver';

/**
 * Scheduling Heuristics & Optimization Utility Functions
 */

export interface ProductPartStep {
  name: string;
  sku: string;
  process?: number[];
  setup?: number[];
  cycle?: number[];
  dependency?: string;
}

export interface OrderItem {
  $key?: string;
  order_no: number;
  order_customer?: string;
  order_product_name?: string;
  order_product_description?: string;
  order_product_part?: ProductPartStep[];
  order_product_sku?: string;
  order_quantity?: number;
  order_duration: number; // Estimated processing time in minutes
  order_delivery: number; // Timestamp in seconds
  order_status: 'waiting' | 'wip' | 'done' | 'late' | 'cancel';
  order_color?: string;
  order_date?: number;
}

export interface StationMachineInfo {
  mid: string;
  name: string;
  number: number;
}

export interface StationItem {
  $key?: string;
  st_name: string;
  st_number: number;
  st_machine?: StationMachineInfo[];
}

export interface InventoryItem {
  $key?: string;
  name: string;
  code: string;
  quantity: number;
  cost?: number;
}

export interface ProductItem {
  $key?: string;
  name: string;
  inventory_code?: string;
  inventory_use?: string;
  part?: ProductPartStep[];
}

export interface DispatchedJobItem {
  job_id: string;
  order_no: number;
  order_customer: string;
  order_product: string;
  order_color: string;
  job_part: string;
  job_sku: string;
  job_quantity: number;
  job_status: 'waiting' | 'wip' | 'done';
  job_machine: number[];
  job_station: number[];
  start: number;
  end: number;
  job_complete: number;
  job_good: number;
  job_defect: number;
  order_delivery: number;
  order_date?: number;
  order_description?: string;
}

export interface OptimizationOptions {
  shiftDurationSeconds?: number;
  concurrencyLimit?: number;
  inventory?: InventoryItem[];
  products?: ProductItem[];
  wasteRatio?: number;
}

/**
 * Heuristics sorting engine using dual priority: Earliest Due Date (EDD) then Shortest Processing Time (SPT)
 */
export function sortOrdersHeuristically(orders: OrderItem[]): OrderItem[] {
  return [...orders].sort((a, b) => {
    // 1. Primary Sort: Earliest Due Date (EDD)
    if (a.order_delivery !== b.order_delivery) {
      return a.order_delivery - b.order_delivery;
    }
    // 2. Secondary Sort (Tie-breaker): Shortest Processing Time (SPT)
    return a.order_duration - b.order_duration;
  });
}

/**
 * Calculates safety yield output inflation considering physical scrap/waste rates.
 * Actual Quantity = Math.ceil(Target / (1 - WasteRatio))
 */
export function calculateRequiredActualQuantity(targetAmount: number, wasteRatio: number): number {
  if (targetAmount <= 0) return 0;
  if (wasteRatio < 0 || wasteRatio >= 1) return targetAmount;
  return Math.ceil(targetAmount / (1 - wasteRatio));
}

/**
 * Calculates standard operations run-duration in seconds.
 * Duration = SetupTime + (CycleTime * TargetInflatedQuantity)
 */
export function calculateOperationDuration(setupSeconds: number, cycleSeconds: number, quantity: number): number {
  if (quantity <= 0) return 0;
  return setupSeconds + (cycleSeconds * quantity);
}

/**
 * Solves Mixed Integer Linear Programming (MILP) model to select optimal set of orders
 * constrained by workstation shift capacity, raw material stock, and line concurrency limit.
 */
export function solveOptimalOrderSelection(
  orders: OrderItem[],
  stations: StationItem[],
  options: OptimizationOptions = {}
): OrderItem[] {
  if (!orders || orders.length === 0) return [];

  const shiftDurationSeconds = options.shiftDurationSeconds || 28800; // 8 hours default
  const concurrencyLimit = options.concurrencyLimit || orders.length;
  const wasteRatio = options.wasteRatio || 0;

  const inventoryMap = new Map<string, number>();
  if (options.inventory) {
    options.inventory.forEach(inv => {
      if (inv.code) inventoryMap.set(inv.code, inv.quantity || 0);
    });
  }

  const productMap = new Map<string, ProductItem>();
  if (options.products) {
    options.products.forEach(p => {
      if (p.name) productMap.set(p.name, p);
    });
  }

  const constraints: Record<string, { max: number }> = {};

  // 1. Concurrency limit constraint
  constraints['concurrency'] = { max: concurrencyLimit };

  // 2. Workstation capacity constraints
  stations.forEach(st => {
    const machineCount = st.st_machine?.length || 1;
    constraints[`station_${st.st_number}`] = { max: shiftDurationSeconds * machineCount };
  });

  // 3. Raw material stock constraints
  inventoryMap.forEach((qty, code) => {
    constraints[`inventory_${code}`] = { max: qty };
  });

  const variables: Record<string, Record<string, number>> = {};
  const binaries: Record<string, number> = {};

  const nowSec = Math.round(Date.now() / 1000);

  orders.forEach((order, index) => {
    const varName = `order_${order.$key || index}`;
    binaries[varName] = 1;

    // Objective scoring: Urgency bonus for earlier due date + quantity
    const secondsToDelivery = Math.max(0, (order.order_delivery || 0) - nowSec);
    const urgencyScore = Math.max(1, Math.round(1000000 / (secondsToDelivery / 3600 + 1)));
    const qtyScore = (order.order_quantity || 1) * 10;
    const valueScore = urgencyScore + qtyScore;

    const varCoefs: Record<string, number> = {
      score: valueScore,
      concurrency: 1
    };

    // Calculate station time usage
    const targetQty = calculateRequiredActualQuantity(order.order_quantity || 1, wasteRatio);
    const parts = order.order_product_part || [];

    parts.forEach(part => {
      const processes = part.process || [];
      const setups = part.setup || [];
      const cycles = part.cycle || [];

      processes.forEach((stNum, pIdx) => {
        const setupSec = setups[pIdx] || 0;
        const cycleSec = cycles[pIdx] || 0;
        const durationSec = calculateOperationDuration(setupSec, cycleSec, targetQty);

        const constraintKey = `station_${stNum}`;
        varCoefs[constraintKey] = (varCoefs[constraintKey] || 0) + durationSec;
      });
    });

    // Calculate raw material consumption
    if (order.order_product_name && productMap.has(order.order_product_name)) {
      const prod = productMap.get(order.order_product_name)!;
      if (prod.inventory_code && prod.inventory_use) {
        const usagePerUnit = parseFloat(prod.inventory_use) || 0;
        const totalMaterialRequired = targetQty * usagePerUnit;
        const invKey = `inventory_${prod.inventory_code}`;
        varCoefs[invKey] = (varCoefs[invKey] || 0) + totalMaterialRequired;
      }
    }

    variables[varName] = varCoefs;
  });

  const model: LpModel = {
    optimize: 'score',
    opType: 'max',
    constraints,
    variables,
    binaries
  };

  try {
    const solution = solver.Solve(model);
    if (solution && solution.feasible) {
      const selectedOrders = orders.filter((order, index) => {
        const varName = `order_${order.$key || index}`;
        return solution[varName] === 1;
      });

      if (selectedOrders.length > 0) {
        return sortOrdersHeuristically(selectedOrders);
      }
    }
  } catch (err) {
    console.warn('Linear Programming solver warning, falling back to heuristic sort:', err);
  }

  // Fallback if LP solver is infeasible or returns empty set:
  const sorted = sortOrdersHeuristically(orders);
  return sorted.slice(0, concurrencyLimit);
}

/**
 * Computes finite-capacity chronological queue timeline schedules.
 * Ensures workstation operations do not overlap in time.
 */
export function scheduleOrdersFiniteCapacity(
  orders: OrderItem[],
  stations: StationItem[],
  initialStartTimestamp: number,
  delaySeconds: number = 600,
  wasteRatio: number = 0
): DispatchedJobItem[] {
  const resultJobs: DispatchedJobItem[] = [];
  const stationEndTimes = new Map<number, number>();

  stations.forEach(st => {
    stationEndTimes.set(st.st_number, initialStartTimestamp);
  });

  orders.forEach(order => {
    const parts = order.order_product_part || [];
    const targetQty = calculateRequiredActualQuantity(order.order_quantity || 1, wasteRatio);

    // Track completed end times per part SKU in this order
    const partEndTimes = new Map<string, number>();

    // Sort parts so independent parts run before dependent assembly parts
    const sortedParts = [...parts].sort((a, b) => {
      if (!a.dependency && b.dependency) return -1;
      if (a.dependency && !b.dependency) return 1;
      if (a.dependency === b.sku) return 1;
      if (b.dependency === a.sku) return -1;
      return 0;
    });

    sortedParts.forEach(part => {
      const partProcesses = part.process || [];
      const partSetups = part.setup || [];
      const partCycles = part.cycle || [];

      // If this part depends on a prerequisite part SKU, wait for that prerequisite part to complete (+ inter-station transfer delay)
      let prerequisiteEndTime = initialStartTimestamp;
      if (part.dependency && partEndTimes.has(part.dependency)) {
        prerequisiteEndTime = partEndTimes.get(part.dependency)! + delaySeconds;
      }

      let partPreviousStepEndTime = prerequisiteEndTime;
      const jobID = Math.random().toString(36).substring(2, 14);

      for (let pIdx = 0; pIdx < partProcesses.length; pIdx++) {
        const stationNum = partProcesses[pIdx];
        const setupSec = partSetups[pIdx] || 0;
        const cycleSec = partCycles[pIdx] || 0;

        const totalWorkloadSec = calculateOperationDuration(setupSec, cycleSec, targetQty);

        const station = stations.find(s => s.st_number === stationNum);
        const machinesAvailable = station?.st_machine?.length || 1;
        const scaledDurationSec = Math.ceil(totalWorkloadSec / machinesAvailable);

        const stationAvailableTime = stationEndTimes.get(stationNum) || initialStartTimestamp;

        // Finite capacity routing rule:
        // Job cannot start until BOTH prerequisite / previous part step finishes (+ delay) AND workstation is free
        const startSeconds = Math.max(
          partPreviousStepEndTime + (pIdx > 0 ? delaySeconds : 0),
          stationAvailableTime
        );
        const endSeconds = startSeconds + scaledDurationSec;

        stationEndTimes.set(stationNum, endSeconds);
        partPreviousStepEndTime = endSeconds;

        resultJobs.push({
          job_id: jobID,
          order_no: order.order_no,
          order_customer: order.order_customer || 'N/A',
          order_product: order.order_product_name || 'N/A',
          order_color: order.order_color || '#202020',
          job_part: part.name || 'Main Component',
          job_sku: part.sku || 'SKU-GEN',
          job_quantity: order.order_quantity || 1,
          job_status: 'waiting',
          job_machine: [machinesAvailable],
          job_station: [stationNum],
          start: startSeconds,
          end: endSeconds,
          job_complete: 0.00,
          job_good: 0,
          job_defect: 0,
          order_delivery: order.order_delivery || 0,
          order_date: order.order_date,
          order_description: order.order_product_description
        });
      }

      // Record completion timestamp for this part SKU
      if (part.sku) {
        partEndTimes.set(part.sku, partPreviousStepEndTime);
      }
    });
  });

  return resultJobs;
}
