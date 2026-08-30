import { describe, it, expect } from 'vitest';
import { 
  sortOrdersHeuristically, 
  calculateRequiredActualQuantity, 
  calculateOperationDuration,
  solveOptimalOrderSelection,
  scheduleOrdersFiniteCapacity,
  OrderItem,
  StationItem,
  InventoryItem,
  ProductItem
} from './scheduling.js';

describe('JobShop Scheduling Heuristics & Optimization', () => {

  describe('sortOrdersHeuristically (EDD + SPT)', () => {
    it('should sort orders by Earliest Due Date (EDD)', () => {
      const orders: OrderItem[] = [
        { order_no: 1, order_delivery: 200, order_duration: 30, order_status: 'waiting' },
        { order_no: 2, order_delivery: 100, order_duration: 40, order_status: 'waiting' },
        { order_no: 3, order_delivery: 150, order_duration: 20, order_status: 'waiting' }
      ];

      const sorted = sortOrdersHeuristically(orders);
      
      expect(sorted[0].order_no).toBe(2); // Due at 100
      expect(sorted[1].order_no).toBe(3); // Due at 150
      expect(sorted[2].order_no).toBe(1); // Due at 200
    });

    it('should break ties using Shortest Processing Time (SPT) when due dates match', () => {
      const orders: OrderItem[] = [
        { order_no: 1, order_delivery: 100, order_duration: 50, order_status: 'waiting' }, // Longer duration
        { order_no: 2, order_delivery: 100, order_duration: 20, order_status: 'waiting' }, // Shortest duration (wins tie-break)
        { order_no: 3, order_delivery: 100, order_duration: 30, order_status: 'waiting' }  // Medium duration
      ];

      const sorted = sortOrdersHeuristically(orders);
      
      expect(sorted[0].order_no).toBe(2); // SPT wins
      expect(sorted[1].order_no).toBe(3);
      expect(sorted[2].order_no).toBe(1);
    });
  });

  describe('calculateRequiredActualQuantity (Waste Yield Buffer)', () => {
    it('should inflate quantity based on acceptable waste ratio', () => {
      const target = 100;
      const wasteRatio = 0.05; // 5% waste
      
      // 100 / 0.95 = 105.263 => Ceils to 106
      const actual = calculateRequiredActualQuantity(target, wasteRatio);
      expect(actual).toBe(106);
    });

    it('should return target amount if waste is zero', () => {
      expect(calculateRequiredActualQuantity(50, 0)).toBe(50);
    });

    it('should handle zero or negative targets gracefully', () => {
      expect(calculateRequiredActualQuantity(0, 0.05)).toBe(0);
      expect(calculateRequiredActualQuantity(-10, 0.05)).toBe(0);
    });

    it('should fallback to target if waste ratio is invalid', () => {
      expect(calculateRequiredActualQuantity(100, -0.1)).toBe(100);
      expect(calculateRequiredActualQuantity(100, 1.0)).toBe(100);
    });
  });

  describe('calculateOperationDuration (Line Capacity Run)', () => {
    it('should compute durations correctly', () => {
      const setup = 120; // 2 mins setup
      const cycle = 60;  // 1 min cycle
      const qty = 10;
      
      // 120 + (60 * 10) = 720
      expect(calculateOperationDuration(setup, cycle, qty)).toBe(720);
    });

    it('should return zero if target quantity is zero', () => {
      expect(calculateOperationDuration(120, 60, 0)).toBe(0);
    });
  });

  describe('solveOptimalOrderSelection (Discrete MILP Optimization)', () => {
    const stations: StationItem[] = [
      { st_number: 1, st_name: 'Cutting Station', st_machine: [{ mid: 'm1', name: 'Cutter', number: 1 }] },
      { st_number: 2, st_name: 'Sewing Station', st_machine: [{ mid: 'm2', name: 'Sewing M/C', number: 2 }] }
    ];

    it('should enforce concurrency limits', () => {
      const orders: OrderItem[] = [
        { $key: 'ord1', order_no: 101, order_quantity: 10, order_delivery: 1000, order_duration: 30, order_status: 'waiting', order_product_part: [{ name: 'P1', sku: 'S1', process: [1], setup: [60], cycle: [10] }] },
        { $key: 'ord2', order_no: 102, order_quantity: 10, order_delivery: 1050, order_duration: 30, order_status: 'waiting', order_product_part: [{ name: 'P1', sku: 'S1', process: [1], setup: [60], cycle: [10] }] },
        { $key: 'ord3', order_no: 103, order_quantity: 10, order_delivery: 1100, order_duration: 30, order_status: 'waiting', order_product_part: [{ name: 'P1', sku: 'S1', process: [1], setup: [60], cycle: [10] }] }
      ];

      const selected = solveOptimalOrderSelection(orders, stations, {
        concurrencyLimit: 2,
        shiftDurationSeconds: 28800
      });

      expect(selected.length).toBeLessThanOrEqual(2);
    });

    it('should enforce workstation shift capacity limits', () => {
      const orders: OrderItem[] = [
        // Huge order taking 10,000 seconds on Station 1
        { $key: 'ord1', order_no: 1, order_quantity: 500, order_delivery: 1000, order_duration: 200, order_status: 'waiting', order_product_part: [{ name: 'Part A', sku: 'SKU1', process: [1], setup: [1000], cycle: [20] }] },
        // Smaller orders taking 500 seconds each
        { $key: 'ord2', order_no: 2, order_quantity: 10, order_delivery: 900, order_duration: 10, order_status: 'waiting', order_product_part: [{ name: 'Part B', sku: 'SKU2', process: [1], setup: [100], cycle: [40] }] },
        { $key: 'ord3', order_no: 3, order_quantity: 10, order_delivery: 950, order_duration: 10, order_status: 'waiting', order_product_part: [{ name: 'Part C', sku: 'SKU3', process: [1], setup: [100], cycle: [40] }] }
      ];

      // Shift duration set tightly to 1500 seconds
      const selected = solveOptimalOrderSelection(orders, stations, {
        shiftDurationSeconds: 1500,
        concurrencyLimit: 5
      });

      // Big order ord1 (11,000s) exceeds 1500s shift capacity, so only smaller orders can be selected
      expect(selected.some(o => o.order_no === 1)).toBe(false);
      expect(selected.some(o => o.order_no === 2 || o.order_no === 3)).toBe(true);
    });

    it('should respect raw material inventory stock bounds', () => {
      const inventory: InventoryItem[] = [
        { code: 'MAT-STEEL', name: 'Steel Sheet', quantity: 20 }
      ];

      const products: ProductItem[] = [
        { name: 'Steel Frame', inventory_code: 'MAT-STEEL', inventory_use: '2.0' }
      ];

      const orders: OrderItem[] = [
        // Requires 10 units * 2.0 = 20 MAT-STEEL (fits stock)
        { $key: 'o1', order_no: 1, order_product_name: 'Steel Frame', order_quantity: 10, order_delivery: 1000, order_duration: 20, order_status: 'waiting', order_product_part: [{ name: 'Frame', sku: 'F1', process: [1], setup: [60], cycle: [10] }] },
        // Requires 15 units * 2.0 = 30 MAT-STEEL (exceeds stock 20)
        { $key: 'o2', order_no: 2, order_product_name: 'Steel Frame', order_quantity: 15, order_delivery: 900, order_duration: 20, order_status: 'waiting', order_product_part: [{ name: 'Frame', sku: 'F1', process: [1], setup: [60], cycle: [10] }] }
      ];

      const selected = solveOptimalOrderSelection(orders, stations, {
        inventory,
        products,
        shiftDurationSeconds: 28800,
        concurrencyLimit: 2
      });

      // o2 requires 30 MAT-STEEL but only 20 in stock, so o2 cannot be selected
      expect(selected.some(o => o.$key === 'o2')).toBe(false);
      expect(selected.some(o => o.$key === 'o1')).toBe(true);
    });
  });

  describe('scheduleOrdersFiniteCapacity (Non-Overlapping Queue Dispatch)', () => {
    const stations: StationItem[] = [
      { st_number: 1, st_name: 'Station 1', st_machine: [{ mid: 'm1', name: 'Machine 1', number: 1 }] },
      { st_number: 2, st_name: 'Station 2', st_machine: [{ mid: 'm2', name: 'Machine 2', number: 2 }] }
    ];

    it('should schedule sequential jobs without workstation overlaps', () => {
      const orders: OrderItem[] = [
        {
          order_no: 101,
          order_customer: 'Client A',
          order_product_name: 'Product A',
          order_quantity: 10,
          order_delivery: 1000,
          order_duration: 20,
          order_status: 'waiting',
          order_product_part: [
            { name: 'Part 1', sku: 'SKU1', process: [1, 2], setup: [60, 60], cycle: [10, 10] }
          ]
        },
        {
          order_no: 102,
          order_customer: 'Client B',
          order_product_name: 'Product B',
          order_quantity: 10,
          order_delivery: 1050,
          order_duration: 20,
          order_status: 'waiting',
          order_product_part: [
            { name: 'Part 1', sku: 'SKU2', process: [1, 2], setup: [60, 60], cycle: [10, 10] }
          ]
        }
      ];

      const startTime = 100000;
      const interStationDelay = 600; // 10 mins

      const jobs = scheduleOrdersFiniteCapacity(orders, stations, startTime, interStationDelay, 0);

      // Total 4 jobs (2 orders x 2 steps)
      expect(jobs.length).toBe(4);

      // Order 101 Step 1 on ST-1
      const job1_st1 = jobs.find(j => j.order_no === 101 && j.job_station.includes(1))!;
      expect(job1_st1.start).toBe(startTime);
      // Workload = 60 + (10 * 10) = 160s
      expect(job1_st1.end).toBe(startTime + 160);

      // Order 102 Step 1 on ST-1 (Must wait until ST-1 is free from Order 101!)
      const job2_st1 = jobs.find(j => j.order_no === 102 && j.job_station.includes(1))!;
      expect(job2_st1.start).toBeGreaterThanOrEqual(job1_st1.end);
      expect(job2_st1.start).toBe(startTime + 160);
      expect(job2_st1.end).toBe(startTime + 160 + 160);

      // Order 101 Step 2 on ST-2 (Must wait for Step 1 end + delay AND ST-2 availability)
      const job1_st2 = jobs.find(j => j.order_no === 101 && j.job_station.includes(2))!;
      expect(job1_st2.start).toBe(job1_st1.end + interStationDelay);

      // Order 102 Step 2 on ST-2 (Must wait for BOTH Step 1 end + delay AND ST-2 free time)
      const job2_st2 = jobs.find(j => j.order_no === 102 && j.job_station.includes(2))!;
      const minStartJob2St2 = Math.max(job2_st1.end + interStationDelay, job1_st2.end);
      expect(job2_st2.start).toBe(minStartJob2St2);
    });
  });
});
