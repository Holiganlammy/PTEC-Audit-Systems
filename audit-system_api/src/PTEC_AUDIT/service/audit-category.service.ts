import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditCategoryItem } from '../domain/model/audit-category-item.entity';

export class CreateCategoryDto {
  categoryName!: string;
  categoryCode?: number;
  description?: string;
  createdBy!: number;
}

export class UpdateCategoryDto {
  categoryName?: string;
  categoryCode?: number;
  description?: string;
  updatedBy!: number;
}

@Injectable()
export class AuditCategoryService {
  constructor(
    @InjectRepository(AuditCategoryItem)
    private readonly categoryRepository: Repository<AuditCategoryItem>,
  ) {}

  // Get all active categories with pagination
  async findAll(filters?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<{
    data: AuditCategoryItem[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;

    const query = this.categoryRepository
      .createQueryBuilder('cat')
      .where('cat.active = :active', { active: true });

    if (filters?.search) {
      query.andWhere(
        '(cat.categoryName LIKE :search OR CAST(cat.categoryCode AS NVARCHAR) LIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    query.orderBy('cat.categoryName', 'ASC').skip(skip).take(limit);

    const [data, total] = await query.getManyAndCount();
    return { data, total, page, limit };
  }

  // Get category by ID
  async findOne(id: number): Promise<AuditCategoryItem> {
    const category = await this.categoryRepository.findOne({
      where: { categoryItemId: id, active: true },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    return category;
  }

  // Create new category
  async create(createDto: CreateCategoryDto): Promise<AuditCategoryItem> {
    // Check if category code already exists
    if (createDto.categoryCode) {
      const existingCategory = await this.categoryRepository.findOne({
        where: { categoryCode: createDto.categoryCode },
      });

      if (existingCategory) {
        throw new ConflictException(
          `Category code ${createDto.categoryCode} already exists`,
        );
      }
    }

    const category = this.categoryRepository.create({
      categoryName: createDto.categoryName,
      categoryCode: createDto.categoryCode,
      description: createDto.description,
      active: true,
      createdBy: createDto.createdBy,
    });

    return await this.categoryRepository.save(category);
  }

  // Update category
  async update(
    id: number,
    updateDto: UpdateCategoryDto,
  ): Promise<AuditCategoryItem> {
    const category = await this.findOne(id);

    // Check if new category code conflicts
    if (
      updateDto.categoryCode &&
      updateDto.categoryCode !== category.categoryCode
    ) {
      const existingCategory = await this.categoryRepository.findOne({
        where: { categoryCode: updateDto.categoryCode },
      });

      if (existingCategory) {
        throw new ConflictException(
          `Category code ${updateDto.categoryCode} already exists`,
        );
      }
    }

    Object.assign(category, updateDto);
    category.updatedAt = new Date();

    return await this.categoryRepository.save(category);
  }

  // Soft delete
  async remove(id: number, updatedBy: number): Promise<void> {
    const category = await this.findOne(id);
    category.active = false;
    category.updatedBy = updatedBy;
    await this.categoryRepository.save(category);
  }

  // Hard delete
  async delete(id: number): Promise<void> {
    const result = await this.categoryRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }
  }
}
