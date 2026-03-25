export interface PaginationParams {
  page?: number;
  limit?: number;
  status?: number;
  branchId?: number;
  auditorUserId?: number;
  active?: boolean;
}

export interface PaginationMeta {
  page: string;
  limit: string;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Interface for user info
export interface UserInfo {
  role_id: number;
  is_admin: boolean;
  user_id?: number;
  username?: string;
}

// Interface for simplified user data in response
export interface UserData {
  userCode: string;
  fullname: string;
  email: string;
  position: string;
  branchId: number;
  userId?: number;
}

// Interface for audit item with user data
export interface AuditItemWithUsers {
  itemId: number;
  jobId: number;
  categoryItemId: number;
  inspectionDate: Date;
  itemStatus: number;
  remarks: string;
  createdAt: Date;
  updatedAt: Date;
  active: boolean;
  createdByUser?: UserData;
  updatedByUser?: UserData;
  categoryItem?: any;
  amDetails?: amDetails[];
  auditDetails?: auditDetails[];
  otherDetails?: OtherDetails[];
  taggedUsers?: any[];
}

interface auditDetails {
  auditDetailId: number;
  itemId: number;
  userId: number;
  note: string;
  approverStatus: number;
  createdBy: number;
  createdAt: Date;
  approverBy?: number;
  approverDate?: Date;
  updateBy?: number;
  updatedAt?: Date;
  active: boolean;
  OwnerCommentUser?: UserData;
  approverByUser?: UserData;
}

interface amDetails {
  amDetailId: number;
  itemId: number;
  userId: number;
  note: string;
  approverStatus: number;
  createdBy: number;
  createdAt: Date;
  approverBy?: number;
  approverDate?: Date;
  updateBy?: number;
  updatedAt?: Date;
  active: boolean;
  OwnerCommentUser?: UserData;
  approverByUser?: UserData;
}

interface OtherDetails {
  otherDetailId: number;
  itemId: number;
  userId: number;
  note: string;
  approverStatus: number;
  approverBy?: number;
  approverDate?: Date;
  createdBy: number;
  createdAt: Date;
  updateBy?: number;
  updatedAt?: Date;
  active: boolean;
  OwnerCommentUser?: UserData;
  approverByUser?: UserData;
}
// Interface for audit job with user data
export interface AuditJobWithUsers {
  auditor?: UserData;
  districtManager?: UserData;
  branchManager?: UserData;
  createdByUser?: UserData;
  updatedByUser?: UserData;
  items?: AuditItemWithUsers[];
}

// Interface for paginated response
export interface PaginatedResponse {
  code: number;
  data: AuditJobWithUsers[];
  message: string;
  pagination: PaginationMeta;
  user: UserInfo;
}

export interface MenuAuditType {
  d: number;
  menuName: string;
  parentId?: number;
  roleId?: number;
  permissions?: string[];
}
