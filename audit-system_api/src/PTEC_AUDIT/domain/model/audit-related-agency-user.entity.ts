import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { AuditItem } from './audit-item.entity';

@Entity('AuditItemsRelated_agency_Users')
export class AuditItemRelatedAgencyUser {
  @PrimaryGeneratedColumn({ name: 'tagged_user_id' })
  taggedUserId: number;

  @Column({ name: 'item_id', type: 'int', nullable: true })
  itemId: number;

  @Column({ name: 'user_id', type: 'int', nullable: true })
  userId: number;

  @Column({ name: 'tagged_by', type: 'int', nullable: true })
  taggedBy: number;

  @CreateDateColumn({ name: 'tagged_at', type: 'datetime' })
  taggedAt: Date;

  @Column({ name: 'active', type: 'bit', default: 1 })
  active: boolean;

  // Relations
  @ManyToOne(() => AuditItem, (item) => item.taggedUsers)
  @JoinColumn({ name: 'item_id' })
  item: AuditItem;
}
