// ==========================================
// audit.jobs-header.entity.ts - ตาม Columns จริง
// ==========================================

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { AuditItem } from './audit-item.entity';
import { AuditHeaderStatus } from './audit-status.entity';

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

  // @Column({ name: 'pm_first_name', type: 'nvarchar', length: 100, nullable: true })
  // pmFirstName: string;

  // @Column({ name: 'pm_last_name', type: 'nvarchar', length: 100, nullable: true })
  // pmLastName: string;

  // ==========================================
  // Auditor (4 columns)
  // ==========================================
  @Column({ name: 'auditor_user_id', type: 'int', nullable: true })
  auditorUserId: number;

  @Column({
    name: 'auditor_user_code',
    type: 'nvarchar',
    length: 50,
    nullable: true,
  })
  auditorUserCode: string;

  @Column({
    name: 'auditor_first_name',
    type: 'nvarchar',
    length: 100,
    nullable: true,
  })
  auditorFirstName: string;

  @Column({
    name: 'auditor_last_name',
    type: 'nvarchar',
    length: 100,
    nullable: true,
  })
  auditorLastName: string;

  @Column({
    name: 'auditor_branch_name',
    type: 'nvarchar',
    length: 200,
    nullable: true,
  })
  auditorBranchName: string;

  // ==========================================
  // District Manager (4 columns)
  // ==========================================
  @Column({ name: 'district_manager_user_id', type: 'int', nullable: true })
  districtManagerUserId: number;

  @Column({
    name: 'district_manager_user_code',
    type: 'nvarchar',
    length: 50,
    nullable: true,
  })
  districtManagerUserCode: string;

  @Column({
    name: 'district_manager_first_name',
    type: 'nvarchar',
    length: 100,
    nullable: true,
  })
  districtManagerFirstName: string;

  @Column({
    name: 'district_manager_last_name',
    type: 'nvarchar',
    length: 100,
    nullable: true,
  })
  districtManagerLastName: string;

  @Column({
    name: 'district_manager_branch_name',
    type: 'nvarchar',
    length: 200,
    nullable: true,
  })
  districtManagerBranchName: string;

  // ==========================================
  // Branch Manager (3 columns - ไม่มี branch_name)
  // ==========================================
  @Column({ name: 'branch_manager_user_id', type: 'int', nullable: true })
  branchManagerUserId: number;

  @Column({
    name: 'branch_manager_user_code',
    type: 'nvarchar',
    length: 50,
    nullable: true,
  })
  branchManagerUserCode: string;

  @Column({
    name: 'branch_manager_first_name',
    type: 'nvarchar',
    length: 100,
    nullable: true,
  })
  branchManagerFirstName: string;

  @Column({
    name: 'branch_manager_last_name',
    type: 'nvarchar',
    length: 100,
    nullable: true,
  })
  branchManagerLastName: string;

  // ไม่มี branch_manager_branch_name เพราะใช้ branch_name ที่ header

  // ==========================================
  // Other fields
  // ==========================================
  @Column({ name: 'additional_notes', type: 'nvarchar', nullable: true })
  additionalNotes: string;

  @Column({ name: 'excel_file_name', type: 'nvarchar', nullable: true })
  excelFileName: string;

  @Column({ name: 'excel_file_path', type: 'nvarchar', nullable: true })
  excelFilePath: string;

  @Column({ name: 'status', type: 'int', nullable: true, default: 1 })
  status: number;

  // Relation to Audit_Header_Status
  @ManyToOne(() => AuditHeaderStatus)
  @JoinColumn({ name: 'status' })
  statusInfo: AuditHeaderStatus;

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
