// lib/api/dashboard.ts

import client from "@/lib/axios/interceptors";
import { dataConfig } from "@/config/config";
import { DashboardResponse } from "@/components/dashboard/types/dashboard-am";

export const dashboardApi = {
  /**
   * Fetch dashboard data based on role
   */
  async getDashboardData(roleId: number, dateRange: string = "30"): Promise<DashboardResponse> {
    const response = await client.get(`/dashboard`, {
      headers: dataConfig().headers,
      params: {
        roleId,
        dateRange,
      },
    });
    return response.data.data;
  },

  /**
   * Fetch AM dashboard data
   */
  async getAMDashboard(dateRange: string = "30") {
    const response = await client.get(`/dashboard/am`, {
      headers: dataConfig().headers,
      params: { dateRange },
    });
    return response.data.data;
  },

  /**
   * Fetch Audit dashboard data
   */
  async getAuditDashboard(dateRange: string = "30") {
    const response = await client.get(`/dashboard/audit`, {
      headers: dataConfig().headers,
      params: { dateRange },
    });
    return response.data.data;
  },

  /**
   * Fetch User dashboard data
   */
  async getUserDashboard(userId: string, dateRange: string = "30") {
    const response = await client.get(`/dashboard/user`, {
      headers: dataConfig().headers,
      params: { dateRange },
    });
    return response.data.data;
  },

  /**
   * Fetch Manager dashboard data
   */
  async getManagerDashboard(dateRange: string = "30") {
    const response = await client.get(`/dashboard/manager`, {
      headers: dataConfig().headers,
      params: { dateRange },
    });
    return response.data.data;
  },

    async getUserChart(userId: string, dateRange: string = "7") {
    const response = await client.get(`/dashboard/user/chart`, {
      headers: dataConfig().headers,
      params: { dateRange },
    });
    return response.data.data;
  },
 
  /**
   * Fetch AM Chart Data
   */
  async getAMChart(dateRange: string = "7") {
    const response = await client.get(`/dashboard/am/chart`, {
      headers: dataConfig().headers,
      params: { dateRange },
    });
    return response.data.data;
  },
 
  /**
   * Fetch Audit Chart Data
   */
  async getAuditChart(dateRange: string = "7") {
    const response = await client.get(`/dashboard/audit/chart`, {
      headers: dataConfig().headers,
      params: { dateRange },
    });
    return response.data.data;
  },
 
  /**
   * Fetch Manager Chart Data
   */
  async getManagerChart(dateRange: string = "7") {
    const response = await client.get(`/dashboard/manager/chart`, {
      headers: dataConfig().headers,
      params: { dateRange },
    });
    return response.data.data;
  },
};