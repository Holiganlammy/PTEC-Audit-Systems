import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { OneToMany } from 'typeorm';
import { AuditItem } from './audit-item.entity';
@Entity('Audit_Am_Checker_Status')
export class AuditAmCheckerStatus {
  @PrimaryGeneratedColumn({ name: 'am_checker_status_id' })
  amCheckerStatusId!: number;

  @Column({ name: 'am_checker_status', type: 'nvarchar', length: 500 })
  amCheckerStatus!: string;

  @OneToMany(() => AuditItem, (item) => item.amChecklistStatusRelation)
  items!: AuditItem[];
}
