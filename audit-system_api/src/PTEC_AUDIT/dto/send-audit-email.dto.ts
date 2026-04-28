import { IsString, IsOptional } from 'class-validator';
export class SendAuditJobEmailDto {
  @IsOptional()
  @IsString({ each: true })
  groupEmails!: string[]; // ['ptaudit@rpcthai.com', 'groupssd@rpcthai.com']

  @IsOptional()
  @IsString({ each: true })
  additionalRecipients!: string[]; // ['swp@rpcthai.com']

  @IsString()
  jobNo!: string;

  @IsString()
  branchName!: string;

  @IsString()
  auditDate!: string;

  @IsOptional()
  @IsString()
  createdByFullname?: string;

  @IsOptional()
  @IsString()
  auditorFullname?: string;

  @IsOptional()
  @IsString()
  districtManagerFullname?: string;

  @IsOptional()
  @IsString()
  branchManagerFullname?: string;

  @IsOptional()
  @IsString()
  jobUrl?: string;
}
