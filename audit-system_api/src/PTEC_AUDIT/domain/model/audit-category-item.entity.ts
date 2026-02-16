import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { AuditItem } from './audit-item.entity';

@Entity('Audit_Category_Items')
export class AuditCategoryItem {
  @PrimaryGeneratedColumn({ name: 'category_item_id' })
  categoryItemId: number;

  @Column({ name: 'category_name', type: 'nvarchar', nullable: true })
  categoryName: string;

  @Column({ name: 'category_code', type: 'int', nullable: true })
  categoryCode: number;

  @Column({ name: 'description', type: 'nvarchar', nullable: true })
  description: string;

  @Column({ name: 'active', type: 'bit', default: 1 })
  active: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;

  @Column({ name: 'created_by', type: 'int', nullable: true })
  createdBy: number;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  updatedAt: Date;

  @Column({ name: 'updated_by', type: 'int', nullable: true })
  updatedBy: number;

  // Relations
  @OneToMany(() => AuditItem, (item) => item.categoryItem)
  items: AuditItem[];
}
