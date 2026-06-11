import { IsInt, IsIn, IsOptional, IsString, Min } from 'class-validator';

export class CreateBranchAuditScoreDto {
  @IsInt()
  @Min(1)
  jobId!: number;

  @IsInt()
  @Min(1)
  branchId!: number;

  @IsInt()
  @Min(1)
  itemId!: number;

  @IsInt()
  @IsIn([-1, 0, 1], { message: 'Score must be -1, 0, or 1' })
  score!: number;

  @IsInt()
  @Min(1)
  createdBy!: number;

  @IsOptional()
  @IsString()
  remarks?: string;

  @IsOptional()
  @IsString()
  source?: string;
}

export class UpdateBranchAuditScoreDto {
  @IsOptional()
  @IsInt()
  @IsIn([-1, 0, 1], { message: 'Score must be -1, 0, or 1' })
  score?: number;

  @IsOptional()
  @IsString()
  remarks?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  updatedBy?: number;

  @IsOptional()
  @IsString()
  source?: string;
}

export class CreateScoreBatchDto {
  @IsInt()
  @Min(1)
  jobId!: number;

  @IsInt()
  @Min(1)
  branchId!: number;

  @IsInt()
  @Min(1)
  createdBy!: number;

  scores!: Array<{
    itemId: number;
    score: number;
    remarks?: string;
  }>;
}
