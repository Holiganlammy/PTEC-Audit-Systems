import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('Audit_Status')
export class AuditStatus {
  @PrimaryGeneratedColumn({ name: 'audit_status_id' })
  auditStatusId: number;

  @Column({ name: 'status_name', type: 'nvarchar', nullable: true })
  statusName: string;
}
