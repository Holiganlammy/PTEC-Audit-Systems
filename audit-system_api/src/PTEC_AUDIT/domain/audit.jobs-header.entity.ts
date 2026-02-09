import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { AuditItem } from './audit-item.entity';

@Entity('AuditJobs_Header')
export class AuditJobsHeader {
  @PrimaryGeneratedColumn({ name: 'job_id' })
  jobId: number;

  @Column({ name: 'job_no', type: 'nvarchar', nullable: true })
  jobNo: string;

  @Column({ name: 'branch_id', type: 'int', nullable: true })
  branchId: number;

  @Column({ name: 'branch_name', type: 'nvarchar', nullable: true })
  branchName: string;

  @Column({ name: 'audit_date', type: 'date', nullable: true })
  auditDate: Date;

  @Column({ name: 'address', type: 'nvarchar', nullable: true })
  address: string;

  @Column({ name: 'pm_code', type: 'nvarchar', nullable: true })
  pmCode: string;

  @Column({ name: 'auditor_user_id', type: 'int', nullable: true })
  auditorUserId: number;

  @Column({ name: 'district_manager_user_id', type: 'int', nullable: true })
  districtManagerUserId: number;

  @Column({ name: 'branch_manager_user_id', type: 'int', nullable: true })
  branchManagerUserId: number;

  @Column({ name: 'additional_notes', type: 'nvarchar', nullable: true })
  additionalNotes: string;

  @Column({ name: 'excel_file_name', type: 'nvarchar', nullable: true })
  excelFileName: string;

  @Column({ name: 'excel_file_path', type: 'nvarchar', nullable: true })
  excelFilePath: string;

  @Column({ name: 'status', type: 'int', nullable: true })
  status: number;

  @Column({ name: 'created_by', type: 'int', nullable: true })
  createdBy: number;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;

  @Column({ name: 'updated_by', type: 'int', nullable: true })
  updatedBy: number;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  updatedAt: Date;

  @Column({ name: 'active', type: 'bit', default: 1 })
  active: boolean;

  // Relations
  @OneToMany(() => AuditItem, (item) => item.job)
  items: AuditItem[];
}
