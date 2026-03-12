import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { AuditJobsHeader } from './audit.jobs-header.entity';
import { AuditCategoryItem } from './audit-category-item.entity';
import { AuditItemAMDetail } from './audit-item-am-detail.entity';
import { AuditItemAuditDetail } from './audit-item-audit-detail.entity';
import { AuditItemOtherDetails } from './audit-item-other-details.entity';
import { AuditItemOtherDetailsUser } from './audit-item-other-details-users.entity';

@Entity('AuditItems')
export class AuditItem {
  @PrimaryGeneratedColumn({ name: 'item_id' })
  itemId: number;

  @Column({ name: 'job_id', type: 'int', nullable: true })
  jobId: number;

  @Column({ name: 'category_item_id', type: 'int', nullable: true })
  categoryItemId: number;

  @Column({ name: 'inspection_date', type: 'date', nullable: true })
  inspectionDate: Date;

  @Column({ name: 'item_status', type: 'int', nullable: true })
  itemStatus: number;

  @Column({ name: 'remarks', type: 'nvarchar', nullable: true })
  remarks: string;

  @Column({ name: 'created_by', type: 'int', nullable: true })
  createdBy: number;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;

  @Column({ name: 'update_by', type: 'int', nullable: true })
  updateBy: number;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  updatedAt: Date;

  @Column({ name: 'active', type: 'bit', default: 1 })
  active: boolean;

  // Relations
  @ManyToOne(() => AuditJobsHeader, (job) => job.items)
  @JoinColumn({ name: 'job_id' })
  job: AuditJobsHeader;

  @ManyToOne(() => AuditCategoryItem, (category) => category.items)
  @JoinColumn({ name: 'category_item_id' })
  categoryItem: AuditCategoryItem;

  @OneToMany(() => AuditItemAMDetail, (detail) => detail.item)
  amDetail: AuditItemAMDetail[];

  @OneToMany(() => AuditItemAuditDetail, (detail) => detail.item)
  auditDetail: AuditItemAuditDetail[];

  @OneToMany(() => AuditItemOtherDetails, (otherDetail) => otherDetail.item)
  otherDetails: AuditItemOtherDetails[];

  @OneToMany(() => AuditItemOtherDetailsUser, (user) => user.item)
  taggedUsers: AuditItemOtherDetailsUser[];
}
