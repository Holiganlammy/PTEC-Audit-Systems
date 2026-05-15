// lib/api/audit-categories.ts

import client from "@/lib/axios/interceptors";
import { dataConfig } from "@/config/config";

export interface AuditCategory {
  categoryItemId: number;
  categoryName: string;
  categoryCode: string | null;
  description: string;
  positionType: string;
  active: boolean;
  createdAt: Date;
  createdBy: number;
  updatedAt: Date;
  updatedBy: number;
}

export interface CreateCategoryDto {
  categoryName: string;
  categoryCode?: string | null;
  description?: string;
  positionType?: string;
}

export interface UpdateCategoryDto {
  categoryName?: string;
  categoryCode?: string | null;
  description?: string;
  positionType?: string;
}

export interface AuditCategoryPaginatedResponse {
  data: AuditCategory[];
  total: number;
  page: number;
  limit: number;
}

export const auditCategoriesApi = {
  /**
   * Get all categories with pagination
   */
  async getAll(page = 1, limit = 20): Promise<AuditCategoryPaginatedResponse> {
    const response = await client.get("/audit-categories", {
      headers: dataConfig().headers,
      params: { page, limit },
    });
    return {
      data: response.data.data,
      total: response.data.total,
      page: response.data.page,
      limit: response.data.limit,
    };
  },

  /**
   * Get category by ID
   */
  async getById(id: number): Promise<AuditCategory> {
    const response = await client.get(`/audit-categories/${id}`, {
      headers: dataConfig().headers,
    });
    return response.data.data;
  },

  /**
   * Create category
   */
  async create(data: CreateCategoryDto): Promise<AuditCategory> {
    const response = await client.post("/audit-categories", data, {
      headers: dataConfig().headers,
    });
    return response.data.data;
  },

  /**
   * Update category
   */
  async update(id: number, data: UpdateCategoryDto): Promise<AuditCategory> {
    const response = await client.put(`/audit-categories/${id}`, data, {
      headers: dataConfig().headers,
    });
    return response.data.data;
  },

  /**
   * Delete category (soft delete)
   */
  async delete(id: number, updatedBy: number): Promise<void> {
    await client.delete(`/audit-categories/${id}`, {
      headers: dataConfig().headers,
      data: { updatedBy },
    });
  },

  /**
   * Hard delete category
   */
  async hardDelete(id: number): Promise<void> {
    await client.delete(`/audit-categories/${id}/hard`, {
      headers: dataConfig().headers,
    });
  },
};