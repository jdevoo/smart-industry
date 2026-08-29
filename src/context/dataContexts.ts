import { createContext } from '@lit/context';

/**
 * Interface representing a query/array-type dataset state.
 */
export interface QueryContextValue<T = any> {
  data: T[];
  loading: boolean;
  error: Error | null;
}

/**
 * Interface representing a single document/object-type dataset state.
 */
export interface DocContextValue<T = any> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

// Global real-time query contexts
export const ordersContext = createContext<QueryContextValue>('orders-context');
export const machinesContext = createContext<QueryContextValue>('machines-context');
export const stationsContext = createContext<QueryContextValue>('stations-context');
export const productsContext = createContext<QueryContextValue>('products-context');
export const customersContext = createContext<QueryContextValue>('customers-context');
export const inventoryContext = createContext<QueryContextValue>('inventory-context');
export const devicesContext = createContext<QueryContextValue>('devices-context');
export const jobsContext = createContext<QueryContextValue>('jobs-context');

// Global real-time document contexts
export const scheduleConfigContext = createContext<DocContextValue>('schedule-config-context');
export const operationContext = createContext<DocContextValue>('operation-context');
export const performanceContext = createContext<DocContextValue>('performance-context');
