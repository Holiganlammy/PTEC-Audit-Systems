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

@Entity('AuditItem_AMComment')
export class AuditItemAMComment {
  @PrimaryGeneratedColumn({ name: 'am_detail_id' })
  amDetailId: number | undefined;

  @Column({ name: 'item_id', type: 'int', nullable: true })
  itemId!: number;

  @Column({ name: 'approver_by', type: 'int', nullable: true })
  approverBy!: number;

  @Column({ name: 'approver_status', type: 'int', nullable: true })
  approverStatus!: number;

  @Column({ name: 'approver_date', type: 'datetime', nullable: true })
  approverDate!: Date;

  @Column({ name: 'note', type: 'nvarchar', nullable: true })
  note!: string;

  @Column({ name: 'created_by', type: 'int', nullable: true })
  createdBy!: number;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt!: Date;

  @Column({ name: 'update_by', type: 'int', nullable: true })
  updateBy!: number;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  updatedAt!: Date;

  @Column({ name: 'active', type: 'bit', default: 1 })
  active!: boolean;

  @Column({ name: 'user_id', type: 'int', nullable: true })
  userId!: number;

  @Column({ name: 'deleted_by', type: 'int', nullable: true })
  deletedBy!: number;

  @Column({ name: 'deleted_at', type: 'datetime', nullable: true })
  deletedAt!: Date;

  @Column({ name: 'deleted_reason', type: 'nvarchar', nullable: true })
  deletedReason!: string;

  @Column({ name: 'reply_to_id', type: 'int', nullable: true })
  replyToId!: number | null;

  // Relations
  @ManyToOne(() => AuditItem, (item) => item.amComments)
  @JoinColumn({ name: 'item_id' })
  item!: AuditItem;
}
