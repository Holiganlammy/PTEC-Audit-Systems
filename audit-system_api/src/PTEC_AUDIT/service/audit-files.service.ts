import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditFile } from '../domain/model/audit-file.entity';
import { AuditFileType } from '../domain/enum/audit-file-type.enum';

@Injectable()
export class AuditFilesService {
  constructor(
    @InjectRepository(AuditFile)
    private readonly auditFilesRepo: Repository<AuditFile>,
  ) {}

  // Upload file
  async uploadFile(data: {
    fileType: AuditFileType;
    referenceId: number;
    fileName: string;
    filePath: string;
    fileSize?: number;
    mimeType?: string;
    description?: string;
    uploadedBy?: number;
  }): Promise<AuditFile> {
    const file = this.auditFilesRepo.create(data);
    return await this.auditFilesRepo.save(file);
  }

  // Get files by type and reference
  async getFiles(
    fileType: AuditFileType,
    referenceId: number,
  ): Promise<AuditFile[]> {
    return await this.auditFilesRepo.find({
      where: {
        fileType,
        referenceId,
        active: true,
      },
      order: { uploadedAt: 'DESC' },
    });
  }

  // Get single file
  async getFile(fileId: number): Promise<AuditFile | null> {
    return await this.auditFilesRepo.findOne({
      where: { fileId, active: true },
    });
  }

  // Delete file (soft delete)
  async deleteFile(fileId: number, deletedBy: number): Promise<void> {
    await this.auditFilesRepo.update(fileId, {
      active: false,
      deletedBy,
      deletedAt: new Date(),
    });
  }

  // Hard delete
  async hardDeleteFile(fileId: number): Promise<void> {
    await this.auditFilesRepo.delete(fileId);
  }

  // Get files for AM Checklist
  async getAMChecklistFiles(itemId: number): Promise<AuditFile[]> {
    return this.getFiles(AuditFileType.AM_CHECKLIST, itemId);
  }

  // Get files for Job Header
  async getJobHeaderFiles(jobId: number): Promise<AuditFile[]> {
    return this.getFiles(AuditFileType.JOB_HEADER, jobId);
  }
}
