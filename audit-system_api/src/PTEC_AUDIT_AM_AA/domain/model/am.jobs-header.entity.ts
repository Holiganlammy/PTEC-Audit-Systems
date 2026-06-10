// Version: 2.0.0 | Date: 2025-06-05 | Updated: Fixed columns - auditor→am_user, district_manager→rm_user

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
import { AMItem } from './am-item.entity';
import { AMHeaderStatus } from './am-status.entity';

@Entity('AMJobs_Header')
export class AMJobHeader {
  @PrimaryGeneratedColumn({ name: 'job_id' })
  jobId!: number;

  @Column({ name: 'job_no', type: 'nvarchar', nullable: true })
  jobNo!: string;

  @Column({ name: 'branch_id', type: 'int', nullable: true })
  branchId!: number;

  @Column({ name: 'branch_name', type: 'nvarchar', nullable: true })
  branchName!: string;

  @Column({ name: 'audit_date', type: 'date', nullable: true })
  auditDate!: Date;

  @Column({ name: 'address', type: 'nvarchar', nullable: true })
  address!: string;

  @Column({ name: 'pm_code', type: 'nvarchar', nullable: true })
  pmCode!: string;

  // ==========================================
  // AM User - คนตรวจสอบ (เดิม: Auditor)
  // ==========================================
  @Column({ name: 'am_user_id', type: 'int', nullable: true })
  amUserId!: number;

  @Column({
    name: 'am_user_code',
    type: 'nvarchar',
    length: 50,
    nullable: true,
  })
  amUserCode!: string;

  @Column({
    name: 'am_first_name',
    type: 'nvarchar',
    length: 200,
    nullable: true,
  })
  amFirstName!: string;

  @Column({
    name: 'am_last_name',
    type: 'nvarchar',
    length: 200,
    nullable: true,
  })
  amLastName!: string;

  @Column({
    name: 'am_branch_name',
    type: 'nvarchar',
    length: 100,
    nullable: true,
  })
  amBranchName!: string;

  // ==========================================
  // RM User - หัวหน้าคนตรวจ (เดิม: District Manager)
  // ==========================================
  @Column({ name: 'rm_user_id', type: 'int', nullable: true })
  rmUserId!: number;

  @Column({
    name: 'rm_user_code',
    type: 'nvarchar',
    length: 50,
    nullable: true,
  })
  rmUserCode!: string;

  @Column({
    name: 'rm_first_name',
    type: 'nvarchar',
    length: 200,
    nullable: true,
  })
  rmFirstName!: string;

  @Column({
    name: 'rm_last_name',
    type: 'nvarchar',
    length: 200,
    nullable: true,
  })
  rmLastName!: string;

  @Column({
    name: 'rm_branch_name',
    type: 'nvarchar',
    length: 100,
    nullable: true,
  })
  rmBranchName!: string;

  // ==========================================
  // Branch Manager
  // ==========================================
  @Column({ name: 'branch_manager_user_id', type: 'int', nullable: true })
  branchManagerUserId!: number;

  @Column({
    name: 'branch_manager_user_code',
    type: 'nvarchar',
    length: 50,
    nullable: true,
  })
  branchManagerUserCode!: string;

  @Column({
    name: 'branch_manager_first_name',
    type: 'nvarchar',
    length: 200,
    nullable: true,
  })
  branchManagerFirstName!: string;

  @Column({
    name: 'branch_manager_last_name',
    type: 'nvarchar',
    length: 200,
    nullable: true,
  })
  branchManagerLastName!: string;

  // ==========================================
  // Other fields
  // ==========================================
  @Column({ name: 'additional_notes', type: 'nvarchar', nullable: true })
  additionalNotes!: string;

  @Column({ name: 'excel_file_name', type: 'nvarchar', nullable: true })
  excelFileName!: string;

  @Column({ name: 'excel_file_path', type: 'nvarchar', nullable: true })
  excelFilePath!: string;

  @Column({ name: 'status', type: 'int', nullable: true, default: 1 })
  status!: number;

  @ManyToOne(() => AMHeaderStatus)
  @JoinColumn({ name: 'status' })
  statusInfo!: AMHeaderStatus;

  @Column({ name: 'created_by', type: 'int', nullable: true })
  createdBy!: number;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt!: Date;

  @Column({ name: 'updated_by', type: 'int', nullable: true })
  updatedBy!: number;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  updatedAt!: Date;

  @Column({ name: 'deleted_at', type: 'datetime', nullable: true })
  deletedAt!: Date | null;

  @Column({ name: 'deleted_by', type: 'int', nullable: true })
  deletedBy?: number;

  @Column({ name: 'delete_reason', type: 'nvarchar', nullable: true })
  deleteReason!: string;

  @Column({ name: 'active', type: 'bit', default: 1 })
  active!: boolean;

  @Column({
    name: 'position_type',
    type: 'nvarchar',
    length: 100,
    nullable: true,
  })
  positionType!: string;

  @Column({ name: 'job_created_email_sent_by', type: 'int', nullable: true })
  jobCreatedEmailSentBy!: number | null;

  @Column({
    name: 'job_created_email_sent_at',
    type: 'datetime',
    nullable: true,
    default: null,
  })
  jobCreatedEmailSentAt!: Date | null;

  // Relations
  @OneToMany(() => AMItem, (item) => item.job)
  items!: AMItem[];
}
