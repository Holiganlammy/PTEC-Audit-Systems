// types/dashboard-chart.ts

export interface AMChartData {
  date: string;
  passed: number;
  failed: number;
  needFix: number;
}

export interface AuditChartData {
  date: string;
  active: number;
  closed: number;
  waitingAM: number;
}

export interface UserChartData {
  date: string;
  total: number;
}

export interface ManagerChartData {
  date: string;
  passed: number;
  failed: number;
  needFix: number;
}

export interface ChartApiResponse<T> {
  success: boolean;
  data: T[];
  message?: string;
  error?: string;
}
