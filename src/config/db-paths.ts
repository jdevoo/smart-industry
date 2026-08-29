/**
 * Database Path Configuration & Strongly-Typed Enums
 * Eliminates magic string technical debt across all views.
 */

export enum DbFolder {
  APP_DATA = 'appData',
  USERS = 'users',
  ORDER_DATA = 'orderData',
  HISTORY_DATA = 'historyData',
  NOTIFICATION_DATA = 'notificationData',
  TRACKING_DATA = 'trackingData',
  WAREHOUSE_DATA = 'warehouseData',
  PERFORMANCE_DATA = 'performanceData',
  SCHEDULE_DATA = 'scheduleData',

  // Under factoryData:
  FACTORY_MACHINE = 'factoryData/machine',
  FACTORY_STATION = 'factoryData/station',
  FACTORY_SCHEDULE = 'factoryData/schedule',
  FACTORY_OPERATION = 'factoryData/operation',
  FACTORY_PRODUCT = 'factoryData/product',
  FACTORY_CUSTOMER = 'factoryData/customer',
  FACTORY_INVENTORY = 'factoryData/inventory',
  FACTORY_PROFILE = 'factoryData/profile',
  FACTORY_PERFORMANCE = 'factoryData/performance',
  FACTORY_ORDER = 'factoryData/order',
  FACTORY_DEVICE = 'factoryData/device',
}

/**
 * Builds the standardized corporate tenant database path.
 */
export function getCompanyPath(companyKey: string, folder: DbFolder | string, suffix: string = ''): string {
  const base = `/data/${companyKey}/${folder}`;
  return suffix ? `${base}/${suffix}` : base;
}

/**
 * Builds the personal user session routing profile path.
 */
export function getUserProfilePath(uid: string): string {
  return `/user/${uid}`;
}
