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

@Entity('AuditItems_OtherComment')
export class AuditItemOtherComment {
  @PrimaryGeneratedColumn({ name: 'other_detail_id' })
  otherDetailId!: number;

  @Column({ name: 'item_id', type: 'int', nullable: true })
  itemId!: number;

  @Column({ name: 'user_id', type: 'int', nullable: true })
  userId!: number;

  @Column({ name: 'note', type: 'nvarchar', nullable: true })
  note!: string;

  @Column({ name: 'approver_status', type: 'int', nullable: true })
  approverStatus!: number;

  @Column({ name: 'approver_date', type: 'datetime', nullable: true })
  approverDate!: Date;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt!: Date;

  @Column({ name: 'created_by', type: 'int', nullable: true })
  createdBy!: number;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  updatedAt!: Date;

  @Column({ name: 'updated_by', type: 'int', nullable: true })
  updatedBy!: number;

  @Column({ name: 'active', type: 'bit', default: 1 })
  active!: boolean;

  @Column({ name: 'approver_by', type: 'int', nullable: true })
  approverBy!: number;

  @Column({ name: 'deleted_by', type: 'int', nullable: true })
  deletedBy!: number;

  @Column({ name: 'deleted_at', type: 'datetime', nullable: true })
  deletedAt!: Date;

  @Column({ name: 'deleted_reason', type: 'nvarchar', nullable: true })
  deletedReason!: string;

  // Relations
  @ManyToOne(() => AuditItem, (item) => item.otherComments)
  @JoinColumn({ name: 'item_id' })
  item!: AuditItem;
}
