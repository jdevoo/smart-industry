/**
 * Scheduling Heuristics Utility Functions
 * Mapped from view-plan-scheduling.html to strongly typed pure helper functions.
 */

export interface OrderItem {
  $key?: string;
  order_no: number;
  order_delivery: number; // Timestamp in seconds
  order_duration: number; // Estimated processing time in minutes
  order_status: 'waiting' | 'wip' | 'done' | 'late' | 'cancel';
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
