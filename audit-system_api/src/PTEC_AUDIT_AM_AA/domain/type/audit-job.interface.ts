export interface PaginationParams {
  page?: number;
  limit?: number;
  status?: number;
  branchId?: number;
  auditorUserId?: number;
  districtManagerUserId?: number;
  branchManagerUserId?: number;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
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
  userId: number;
  userCode: string;
  firstName: string;
  lastName: string;
  fullname: string;
  email?: string;
  position?: string;
  branchId?: number;
  branchName?: string;
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
  amComments?: AmComments[];
  auditComments?: AuditComments[];
  otherComments?: OtherComments[];
  taggedUsers?: any[];
}

interface AuditComments {
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

interface AmComments {
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

interface OtherComments {
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
// Interface for audit status info
export interface AuditStatusInfo {
  amStatusId: number;
  auditStatusId?: number;
  statusName: string;
}

// Interface for audit job with user data
export interface AuditJobWithUsers {
  jobNo: string;
  auditor?: UserData;
  districtManager?: UserData;
  branchManager?: UserData;
  createdByUser?: UserData;
  updatedByUser?: UserData;
  statusInfo?: AuditStatusInfo;
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
