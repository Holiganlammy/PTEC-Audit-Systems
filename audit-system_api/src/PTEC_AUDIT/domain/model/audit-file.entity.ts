import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('audit_files')
export class AuditFile {
  @PrimaryGeneratedColumn({ name: 'file_id' })
  fileId!: number;

  @Column({ name: 'file_type', type: 'nvarchar', length: 50 })
  fileType!: string;

  @Column({ name: 'reference_id', type: 'int' })
  referenceId!: number;

  @Column({ name: 'file_name', type: 'nvarchar', length: 255 })
  fileName!: string;

  @Column({ name: 'file_path', type: 'nvarchar', length: 'MAX' })
  filePath!: string;

  @Column({ name: 'file_size', type: 'bigint', nullable: true })
  fileSize!: number | null;

  @Column({ name: 'mime_type', type: 'nvarchar', length: 100, nullable: true })
  mimeType!: string | null;

  @Column({
    name: 'description',
    type: 'nvarchar',
    length: 'MAX',
    nullable: true,
  })
  description!: string | null;

  @Column({ name: 'uploaded_by', type: 'int', nullable: true })
  uploadedBy!: number | null;

  @CreateDateColumn({ name: 'uploaded_at', type: 'datetime' })
  uploadedAt!: Date;

  @Column({ name: 'active', type: 'bit', default: true })
  active!: boolean;

  @Column({ name: 'deleted_by', type: 'int', nullable: true })
  deletedBy!: number | null;

  @Column({ name: 'deleted_at', type: 'datetime', nullable: true })
  deletedAt!: Date | null;
}
