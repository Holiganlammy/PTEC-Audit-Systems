// audit-files.service.ts - เก็บ Relative Path + ใช้ URL จาก ENV

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { AMFiles } from '../domain/model/am-file.entity';
import { AuditFileType } from '../domain/enum/audit-file-type.enum';
import * as path from 'path';
import { AMItem } from '../domain/model/am-item.entity';

@Injectable()
export class AMFilesService {
  constructor(
    @InjectRepository(AMFiles)
    private readonly AMFilesRepository: Repository<AMFiles>,
    @InjectRepository(AMItem)
    private readonly AMItemRepository: Repository<AMItem>,
  ) {}

  // ==================== Helper: Get File Server Base URL ====================
  private getFileServerBaseUrl(): string {
    // ENV: FILE_SERVER_URL=http://10.224.145.121 หรือ https://audit.purethai.co.th
    return process.env.FILE_SERVER_URL || 'http://localhost:3000';
  }

  // ==================== Helper: Get Physical Base Path ====================
  private getPhysicalBasePath(): string {
    // ENV: AUDIT_FILE_BASE_PATH=D:\files\Audit_file
    return process.env.AUDIT_FILE_BASE_PATH || 'D:\\files\\Audit_file';
  }

  // ==================== Helper: Convert Physical Path to URL Path ====================
  private toUrlPath(physicalPath: string): string {
    const basePath = this.getPhysicalBasePath();

    // แปลง \ เป็น / ทั้งหมด
    const normalizedBase = basePath.replace(/\\/g, '/');
    const normalizedPhysical = physicalPath.replace(/\\/g, '/');

    // ลบ base path ออก เหลือแค่ /job-header/xxx.pdf
    if (normalizedPhysical.startsWith(normalizedBase)) {
      return normalizedPhysical.substring(normalizedBase.length);
    }

    return normalizedPhysical;
  }

  // ==================== Helper: Convert URL Path to Physical Path ====================
  private toPhysicalPath(urlPath: string): string {
    const basePath = this.getPhysicalBasePath();
    return path.join(basePath, urlPath);
  }

  // ==================== Helper: Get Full File URL ====================
  private getFileUrl(urlPath: string): string {
    const baseUrl = this.getFileServerBaseUrl();
    // Remove trailing slash from baseUrl if exists
    const cleanBaseUrl = baseUrl.replace(/\/$/, '');
    return `${cleanBaseUrl}${urlPath}`;
  }

  // ==================== Upload File ====================
  async uploadFile(params: {
    fileType: AuditFileType;
    referenceId: number;
    fileName: string;
    filePath: string; // Physical path: D:\files\Audit_file\job-header\123.pdf
    fileSize: number;
    mimeType: string;
    uploadedBy?: number;
  }): Promise<AMFiles> {
    // แปลง physical path เป็น URL path
    // Input:  D:\files\Audit_file\job-header\123.pdf
    // Output: /job-header/123.pdf
    const urlPath = this.toUrlPath(params.filePath);

    const file = this.AMFilesRepository.create({
      fileType: params.fileType,
      referenceId: params.referenceId,
      fileName: params.fileName,
      filePath: urlPath, // ← เก็บแค่ /job-header/123.pdf
      fileSize: params.fileSize,
      mimeType: params.mimeType,
      uploadedBy: params.uploadedBy,
      active: true,
    });

    return await this.AMFilesRepository.save(file);
  }

  async uploadItemAttachment(params: {
    itemId: number;
    fileName: string;
    filePath: string;
    fileSize: number;
    mimeType: string;
    uploadedBy?: number;
  }): Promise<AMFiles> {
    return this.uploadFile({
      fileType: AuditFileType.ITEM_ATTACHMENT,
      referenceId: params.itemId,
      fileName: params.fileName,
      filePath: params.filePath,
      fileSize: params.fileSize,
      mimeType: params.mimeType,
      uploadedBy: params.uploadedBy,
    });
  }

  // ==================== Get Files ====================
  async getFiles(
    fileType: AuditFileType,
    referenceId: number,
  ): Promise<Array<AMFiles & { fileUrl: string }>> {
    const files = await this.AMFilesRepository.find({
      where: {
        fileType,
        referenceId,
        active: true,
      },
      order: { uploadedAt: 'DESC' },
    });

    // เพิ่ม fileUrl ให้แต่ละไฟล์
    return files.map((file) => ({
      ...file,
      fileUrl: this.getFileUrl(file.filePath),
      // fileUrl: http://10.224.145.121/job-header/123.pdf
    }));
  }

  async getItemAttachments(
    itemId: number,
  ): Promise<Array<AMFiles & { fileUrl: string }>> {
    return this.getFiles(AuditFileType.ITEM_ATTACHMENT, itemId);
  }

  // ==================== Get Single File ====================
  async getFile(fileId: number): Promise<
    AMFiles & {
      fileUrl: string;
      physicalPath: string;
    }
  > {
    const file = await this.AMFilesRepository.findOne({
      where: { fileId, active: true },
    });

    if (!file) {
      throw new NotFoundException(`File with ID ${fileId} not found`);
    }

    return {
      ...file,
      fileUrl: this.getFileUrl(file.filePath),
      physicalPath: this.toPhysicalPath(file.filePath),
      // fileUrl: http://10.224.145.121/job-header/123.pdf
      // physicalPath: D:\files\Audit_file\job-header\123.pdf
    };
  }

  async getItemAttachmentFile(
    itemId: number,
    fileId: number,
  ): Promise<AMFiles & { fileUrl: string; physicalPath: string }> {
    const file = await this.getFile(fileId);

    if (
      (file.fileType as AuditFileType) !== AuditFileType.ITEM_ATTACHMENT ||
      file.referenceId !== itemId
    ) {
      throw new NotFoundException(`File with ID ${fileId} not found`);
    }

    return file;
  }

  // ==================== Delete File (Soft Delete) ====================
  async deleteFile(fileId: number, deletedBy: number): Promise<void> {
    const file = await this.AMFilesRepository.findOne({
      where: { fileId, active: true },
    });

    if (!file) {
      throw new NotFoundException(`File with ID ${fileId} not found`);
    }

    file.active = false;
    file.deletedBy = deletedBy;
    file.deletedAt = new Date();

    await this.AMFilesRepository.save(file);
  }

  async deleteItemAttachment(
    itemId: number,
    fileId: number,
    deletedBy: number,
  ): Promise<void> {
    await this.getItemAttachmentFile(itemId, fileId);
    await this.deleteFile(fileId, deletedBy);
  }
  async getAttachmentsByJobId(jobId: number): Promise<{
    grouped: Record<number, Array<AMFiles & { fileUrl: string }>>;
    totalFiles: number;
  }> {
    // 1. ดึง itemIds ทั้งหมดของ job นี้
    const items = await this.AMItemRepository.find({
      where: { jobId, active: true },
      select: ['itemId'],
    });

    const itemIds = items.map((item) => item.itemId);

    if (itemIds.length === 0) {
      return { grouped: {}, totalFiles: 0 };
    }

    // 2. ดึง item attachments ทั้งหมด (query เดียว)
    const files = await this.AMFilesRepository.find({
      where: {
        fileType: AuditFileType.ITEM_ATTACHMENT,
        referenceId: In(itemIds),
        active: true,
      },
      order: { uploadedAt: 'ASC' },
    });

    // 3. Group by referenceId (itemId)
    const grouped: Record<number, Array<AMFiles & { fileUrl: string }>> = {};

    // Init ทุก itemId เป็น [] (แม้ไม่มีไฟล์)
    for (const itemId of itemIds) {
      grouped[itemId] = [];
    }

    for (const file of files) {
      grouped[file.referenceId].push({
        ...file,
        fileUrl: this.getFileUrl(file.filePath),
      });
    }

    return {
      grouped,
      totalFiles: files.length,
    };
  }
}
