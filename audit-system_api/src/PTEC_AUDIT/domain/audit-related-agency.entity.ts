import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { AuditItem } from './audit-item.entity';

@Entity('AuditItemsRelated_agency')
export class AuditItemRelatedAgency {
  @PrimaryGeneratedColumn({ name: 'related_agency_id' })
  relatedAgencyId: number;

  @Column({ name: 'item_id', type: 'int', nullable: true })
  itemId: number;

  @Column({ name: 'user_id', type: 'int', nullable: true })
  userId: number;

  @Column({ name: 'note', type: 'nvarchar', nullable: true })
  note: string;

  @Column({ name: 'approver_status', type: 'int', nullable: true })
  approverStatus: number;

  @Column({ name: 'approver_date', type: 'date', nullable: true })
  approverDate: Date;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;

  @Column({ name: 'created_by', type: 'int', nullable: true })
  createdBy: number;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  updatedAt: Date;

  @Column({ name: 'updated_by', type: 'int', nullable: true })
  updatedBy: number;

  @Column({ name: 'active', type: 'bit', default: 1 })
  active: boolean;

  // Relations
  @ManyToOne(() => AuditItem, (item) => item.relatedAgencies)
  @JoinColumn({ name: 'item_id' })
  item: AuditItem;
}
