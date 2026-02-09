import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditCategoryItem } from '../domain/audit-category-item.entity';
import { CreateCategoryItemDto } from '../dto/create-category-item.dto';
import { UpdateCategoryItemDto } from '../dto/update-category-item.dto';

@Injectable()
export class CategoryItemsService {
  constructor(
    @InjectRepository(AuditCategoryItem)
    private readonly categoryItemsRepository: Repository<AuditCategoryItem>,
  ) {}

  // Create new category item
  async create(
    createCategoryItemDto: CreateCategoryItemDto,
  ): Promise<AuditCategoryItem> {
    // Check if category code already exists
    if (createCategoryItemDto.categoryCode) {
      const existingCategory = await this.categoryItemsRepository.findOne({
        where: { categoryCode: createCategoryItemDto.categoryCode },
      });

      if (existingCategory) {
        throw new ConflictException(
          `Category with code ${createCategoryItemDto.categoryCode} already exists`,
        );
      }
    }

    const categoryItem = this.categoryItemsRepository.create(
      createCategoryItemDto,
    );
    return await this.categoryItemsRepository.save(categoryItem);
  }

  // Get all category items
  async findAll(activeOnly: boolean = true): Promise<AuditCategoryItem[]> {
    const where = activeOnly ? { active: true } : {};
    return await this.categoryItemsRepository.find({
      where,
      order: { categoryCode: 'ASC' },
    });
  }

  // Get category item by ID
  async findOne(id: number): Promise<AuditCategoryItem> {
    const categoryItem = await this.categoryItemsRepository.findOne({
      where: { categoryItemId: id },
      relations: ['items'],
    });

    if (!categoryItem) {
      throw new NotFoundException(`Category Item with ID ${id} not found`);
    }

    return categoryItem;
  }

  // Get category by code
  async findByCode(categoryCode: number): Promise<AuditCategoryItem> {
    const categoryItem = await this.categoryItemsRepository.findOne({
      where: { categoryCode, active: true },
    });

    if (!categoryItem) {
      throw new NotFoundException(
        `Category with code ${categoryCode} not found`,
      );
    }

    return categoryItem;
  }

  // Update category item
  async update(
    id: number,
    updateCategoryItemDto: UpdateCategoryItemDto,
  ): Promise<AuditCategoryItem> {
    const categoryItem = await this.findOne(id);

    // Check if new category code conflicts with existing
    if (
      updateCategoryItemDto.categoryCode &&
      updateCategoryItemDto.categoryCode !== categoryItem.categoryCode
    ) {
      const existingCategory = await this.categoryItemsRepository.findOne({
        where: { categoryCode: updateCategoryItemDto.categoryCode },
      });

      if (existingCategory) {
        throw new ConflictException(
          `Category with code ${updateCategoryItemDto.categoryCode} already exists`,
        );
      }
    }

    Object.assign(categoryItem, updateCategoryItemDto);

    return await this.categoryItemsRepository.save(categoryItem);
  }

  // Soft delete
  async remove(id: number): Promise<void> {
    const categoryItem = await this.findOne(id);
    categoryItem.active = false;
    await this.categoryItemsRepository.save(categoryItem);
  }

  // Hard delete
  async delete(id: number): Promise<void> {
    const result = await this.categoryItemsRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Category Item with ID ${id} not found`);
    }
  }

  // Search categories by name
  async search(searchTerm: string): Promise<AuditCategoryItem[]> {
    return await this.categoryItemsRepository
      .createQueryBuilder('category')
      .where('category.categoryName LIKE :searchTerm', {
        searchTerm: `%${searchTerm}%`,
      })
      .andWhere('category.active = :active', { active: true })
      .getMany();
  }
}
