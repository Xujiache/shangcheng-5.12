export interface DashboardOverview {
  paidAmount: number;
  paidOrders: number;
  paidCustomers: number;
  versusYesterday: DashboardComparison;
}

export interface DashboardComparison {
  paidAmountPct: number | null;
  paidOrdersPct: number | null;
  paidCustomersPct: number | null;
}

export interface DashboardActions {
  pendingShipment: number;
  pendingRefund: number;
  unreadMessages: number;
  rejectedProducts: number;
  auditingProducts: number;
  pendingStoreAuth: number;
}

export interface DashboardTrendPoint {
  date: string;
  paidAmount: number;
}

export interface DashboardWorkbench {
  updatedAt: string;
  overview: DashboardOverview;
  actions: DashboardActions;
  trend7d: DashboardTrendPoint[];
}

export interface DashboardResponse {
  workbench: DashboardWorkbench;
}

export interface MerchantFeatureFlags {
  homeEntry: Record<string, boolean>;
  roleButton: Record<string, boolean>;
  sideMenu: Record<string, boolean>;
}
