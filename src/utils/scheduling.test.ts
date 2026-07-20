import { describe, it, expect } from 'vitest';
import { 
  sortOrdersHeuristically, 
  calculateRequiredActualQuantity, 
  calculateOperationDuration,
  OrderItem 
} from './scheduling.js';

describe('JobShop Scheduling Heuristics', () => {

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
});
