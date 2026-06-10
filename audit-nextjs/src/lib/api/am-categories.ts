// lib/api/am-categories.ts

import client from "@/lib/axios/interceptors";
import { dataConfig } from "@/config/config";

export interface AMCategory {
  categoryItemId: number;
  categoryName: string;
  categoryCode: number | null;
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
  categoryCode?: number | null;
  description?: string;
  positionType?: string;
}

export interface UpdateCategoryDto {
  categoryName?: string;
  categoryCode?: number | null;
  description?: string | null;
  positionType?: string;
}

export interface AMCategoryPaginatedResponse {
  data: AMCategory[];
  total: number;
  page: number;
  limit: number;
}

export const amCategoriesApi = {
  /**
   * Get all categories with pagination (for management table — shows all positionTypes)
   */
  async getAll(page = 1, limit = 20): Promise<AMCategoryPaginatedResponse> {
    const response = await client.get("/am-categories", {
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
   * Get active categories for select/dropdown use.
   * Passes positionType as a query param so the backend handles filtering.
   * - positionType omitted → backend returns all active categories
   * - positionType provided → backend returns categories matching that positionType
   */
  async getForSelect(positionType?: string | null): Promise<AMCategory[]> {
    const params: Record<string, unknown> = { page: 1, limit: 9999 };
    if (positionType) {
      params.positionType = positionType;
    }

    const response = await client.get("/am-categories", {
      headers: dataConfig().headers,
      params,
    });

    return response.data.data as AMCategory[];
  },

  /**
   * Get category by ID
   */
  async getById(id: number): Promise<AMCategory> {
    const response = await client.get(`/am-categories/${id}`, {
      headers: dataConfig().headers,
    });
    return response.data.data;
  },

  /**
   * Create category
   */
  async create(data: CreateCategoryDto): Promise<AMCategory> {
    const response = await client.post("/am-categories", data, {
      headers: dataConfig().headers,
    });
    return response.data.data;
  },

  /**
   * Update category
   */
  async update(id: number, data: UpdateCategoryDto): Promise<AMCategory> {
    const response = await client.put(`/am-categories/${id}`, data, {
      headers: dataConfig().headers,
    });
    return response.data.data;
  },

  /**
   * Delete category (soft delete)
   */
  async delete(id: number, updatedBy: number): Promise<void> {
    await client.delete(`/am-categories/${id}`, {
      headers: dataConfig().headers,
      data: { updatedBy },
    });
  },

  /**
   * Hard delete category
   */
  async hardDelete(id: number): Promise<void> {
    await client.delete(`/am-categories/${id}/hard`, {
      headers: dataConfig().headers,
    });
  },
};