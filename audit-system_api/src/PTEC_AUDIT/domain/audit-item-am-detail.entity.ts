import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { AuditItem } from './audit-item.entity';

@Entity('AuditItem_AMDetails')
export class AuditItemAMDetail {
  @PrimaryGeneratedColumn({ name: 'am_detail_id' })
  amDetailId: number;

  @Column({ name: 'item_id', type: 'int', nullable: true })
  itemId: number;

  @Column({ name: 'approver_by', type: 'int', nullable: true })
  approverBy: number;

  @Column({ name: 'approver_status', type: 'int', nullable: true })
  approverStatus: number;

  @Column({ name: 'approver_date', type: 'date', nullable: true })
  approverDate: Date;

  @Column({ name: 'note', type: 'nvarchar', nullable: true })
  note: string;

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
  @OneToOne(() => AuditItem, (item) => item.amDetail)
  @JoinColumn({ name: 'item_id' })
  item: AuditItem;
}
