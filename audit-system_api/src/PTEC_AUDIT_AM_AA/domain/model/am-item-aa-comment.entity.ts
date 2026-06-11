import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { AMItem } from './am-item.entity';

@Entity('AMItem_AA_Comment')
export class AMItemAAComment {
  @PrimaryGeneratedColumn({ name: 'aa_detail_id' })
  aaDetailId!: number;

  @Column({ name: 'item_id', type: 'int' })
  itemId!: number;

  @Column({ name: 'approver_status', type: 'int', nullable: true })
  approverStatus!: number;

  @Column({ name: 'approver_by', type: 'int', nullable: true })
  approverBy!: number;

  @Column({ name: 'approver_date', type: 'datetime', nullable: true })
  approverDate!: Date;

  @Column({ name: 'user_id', type: 'int' })
  userId!: number;

  @Column({ name: 'note', type: 'nvarchar', nullable: true })
  note!: string;

  @Column({ name: 'created_by', type: 'int', nullable: true })
  createdBy!: number;

  @Column({
    name: 'created_at',
    type: 'datetime',
    default: () => 'GETDATE()',
    nullable: true,
  })
  createdAt!: Date;

  @Column({ name: 'update_by', type: 'int', nullable: true })
  updateBy!: number;

  @Column({
    name: 'updated_at',
    type: 'datetime',
    default: () => 'GETDATE()',
    nullable: true,
  })
  updatedAt!: Date;

  @Column({ name: 'active', type: 'bit', default: true })
  active!: boolean;

  @Column({ name: 'deleted_by', type: 'int', nullable: true })
  deletedBy!: number;

  @Column({ name: 'deleted_at', type: 'datetime', nullable: true })
  deletedAt!: Date;

  @Column({ name: 'deleted_reason', type: 'nvarchar', nullable: true })
  deletedReason!: string;

  @ManyToOne(() => AMItem, (item) => item.aaComments)
  @JoinColumn({ name: 'item_id' })
  item!: AMItem;
}
