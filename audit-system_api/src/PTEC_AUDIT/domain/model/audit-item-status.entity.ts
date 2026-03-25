import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { OneToMany } from 'typeorm';
import { AuditItem } from './audit-item.entity';
@Entity('Audit_Items_Status')
export class AuditItemStatus {
  @PrimaryGeneratedColumn({ name: 'audit_status_item_id' })
  auditStatusItemId: number;

  @Column({ name: 'status_name', type: 'nvarchar', length: 100 })
  statusName: string;

  @OneToMany(() => AuditItem, (item) => item.itemStatusRelation)
  items: AuditItem[];
}
