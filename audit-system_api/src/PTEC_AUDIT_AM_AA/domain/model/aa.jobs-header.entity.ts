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

@Entity('AAJobs_Header')
export class AAJobHeader {
  @PrimaryGeneratedColumn({ name: 'job_id' })
  jobId!: number;

  @Column({ name: 'job_no', type: 'nvarchar', nullable: true })
  jobNo!: string;

  @Column({ name: 'branch_id', type: 'int', nullable: true })
  branchId!: number;

  @Column({ name: 'branch_name', type: 'nvarchar', nullable: true })
  branchName!: string;

  @Column({ name: 'audit_date', type: 'datetime', nullable: true })
  auditDate!: Date;

  @Column({ name: 'address', type: 'nvarchar', nullable: true })
  address!: string;

  @Column({ name: 'pm_code', type: 'nvarchar', nullable: true })
  pmCode!: string;

  // ==========================================
  // AA User - คนตรวจสอบ
  // ==========================================
  @Column({ name: 'aa_user_id', type: 'int', nullable: true })
  aaUserId!: number;

  @Column({ name: 'aa_user_code', type: 'nvarchar', nullable: true })
  aaUserCode!: string;

  @Column({ name: 'aa_first_name', type: 'nvarchar', nullable: true })
  aaFirstName!: string;

  @Column({ name: 'aa_last_name', type: 'nvarchar', nullable: true })
  aaLastName!: string;

  @Column({ name: 'aa_branch_name', type: 'nvarchar', nullable: true })
  aaBranchName!: string;

  // ==========================================
  // AM Manager - หัวหน้าคนตรวจ
  // ==========================================
  @Column({ name: 'am_manager_user_id', type: 'int', nullable: true })
  amManagerUserId!: number;

  @Column({ name: 'am_manager_user_code', type: 'nvarchar', nullable: true })
  amManagerUserCode!: string;

  @Column({ name: 'am_manager_first_name', type: 'nvarchar', nullable: true })
  amManagerFirstName!: string;

  @Column({ name: 'am_manager_last_name', type: 'nvarchar', nullable: true })
  amManagerLastName!: string;

  @Column({ name: 'am_manager_branch_name', type: 'nvarchar', nullable: true })
  amManagerBranchName!: string;

  // ==========================================
  // Branch Manager
  // ==========================================
  @Column({ name: 'branch_manager_user_id', type: 'int', nullable: true })
  branchManagerUserId!: number;

  @Column({
    name: 'branch_manager_user_code',
    type: 'nvarchar',
    nullable: true,
  })
  branchManagerUserCode!: string;

  @Column({
    name: 'branch_manager_first_name',
    type: 'nvarchar',
    nullable: true,
  })
  branchManagerFirstName!: string;

  @Column({
    name: 'branch_manager_last_name',
    type: 'nvarchar',
    nullable: true,
  })
  branchManagerLastName!: string;

  // ==========================================
  // Other fields
  // ==========================================
  @Column({ name: 'additional_notes', type: 'nvarchar', nullable: true })
  additionalNotes!: string;

  @Column({ name: 'branch_assignment', type: 'nvarchar', length: 'MAX', nullable: true })
  branchAssignment!: string;

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

  @Column({ name: 'position_type', type: 'nvarchar', nullable: true })
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
  @OneToMany(() => AMItem, (item) => item.aaJob)
  items!: AMItem[];
}
