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

// Concrete data interfaces for context values
export interface FactoryProfileData {
  name?: string;
  type?: string;
  model?: string;
  concurrency?: string | number;
  setup?: boolean;
}

export interface OperationConfigData {
  op_start?: string;
  op_end?: string;
  ot_start?: string;
  ot_end?: string;
  op_day?: string[] | string;
  production_model?: string;
}

export interface PerformanceData {
  oee?: number;
  optimize?: string;
  au?: number | string;
  meff?: number | string;
  aw?: number | string;
}

export interface ScheduleConfigData {
  interval?: number | string;
  delay?: number | string;
  start_interval?: number;
}

export interface CompanyUserData {
  uid: string;
  email: string;
  displayname?: string;
  role: string;
  photoURL?: string;
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
export const commitContext = createContext<QueryContextValue>('commit-context');
export const notificationsContext = createContext<QueryContextValue>('notifications-context');
export const warehouseContext = createContext<QueryContextValue>('warehouse-context');
export const companyUsersContext = createContext<QueryContextValue>('company-users-context');
export const scheduleDataContext = createContext<QueryContextValue>('schedule-data-context');

// Global real-time document contexts
export const scheduleConfigContext = createContext<DocContextValue>('schedule-config-context');
export const operationContext = createContext<DocContextValue>('operation-context');
export const performanceContext = createContext<DocContextValue>('performance-context');
export const historyContext = createContext<DocContextValue>('history-context');
export const factoryProfileContext = createContext<DocContextValue>('factory-profile-context');
