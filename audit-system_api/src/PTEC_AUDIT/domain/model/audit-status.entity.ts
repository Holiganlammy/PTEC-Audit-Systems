import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('Audit_Header_Status')
export class AuditHeaderStatus {
  @PrimaryGeneratedColumn({ name: 'audit_status_id' })
  auditStatusId!: number;

  @Column({ name: 'status_name', type: 'nvarchar', nullable: true })
  statusName!: string;
}
