interface User {
    UserID: string;
    UserCode: string;
    Fullname: string;
    BranchName: string;
    BranchID: number;
    DepID: number;
    Email: string;
    SecCode: string | null;
    SecID: string | null;
    DepCode: string;
    DepName: string;
    UserType: string | null;
    img_profile: string | null;
    fristName: string;
    lastName: string;
    Tel: string | null;
    Actived: boolean;
    Position: string;
    PositionCode: string;
    PositionID: number;
    EmpUpperID: string;
    EmpUpper: string;
    ChangePassword: boolean;
    LastDateChangePassword: string;
    role_id: string | null;
    PasswordExpireDate: string;
    PersonalCode: string | null;
}

interface AuditJobData {
  jobId: number;
  jobNo: string;
  branchId: number;
  branchName: string;
  auditDate: string;
  address: string;
  pmCode: string;
  auditorUserId: number;
  districtManagerUserId: number;
  branchManagerUserId: number;
  additionalNotes: string;
  status: number;
  active: boolean;
}

interface Branch {
  branchid: number;
  name: string;
  address?: string;
  code?: string;
}

interface User {
  UserID: string;
  UserCode: string;
  Fullname: string;
  BranchID: number;
  Position: string;
  PositionCode: string;
  Email: string;
}

interface AuditItemData {
    amDetails: amDetails[];
    itemId: number;
    jobId: number;
    categoryItemId: number;
    inspectionDate: string;
    itemStatus: number;
    remarks: string;
    createdBy: number;
    createdAt: string;
    updateBy: number | null;
    updatedAt: string;
    active: boolean;
    categoryItem?: AuditCategoryItem;
    auditDetails: auditDetails[];
    otherDetails: OtherDetails[];
}

interface AuditCategoryItem {
    categoryItemId: number;
    categoryName: string;
    categoryCode: number;
    description: string;
    active: boolean;
    createdAt: string;
    createdBy: number;
    updatedAt: string | null;
    updatedBy: number | null;
}

interface DetailUser {
    userCode: string;
    fullname: string;
    email: string;
    position: string;
    branchId: number;
}

interface amDetails {
    amDetailId: number;
    itemId: number;
    approverBy: number | null;
    approverStatus: number;
    approverDate: string | null;
    note: string;
    createdBy: number;
    createdAt: string;
    updateBy: number | null;
    updatedAt: string;
    active: boolean;
    userId: number;
    OwnerCommentUser?: DetailUser;
    approverByUser?: DetailUser;
}

interface auditDetails {
    auditDetailId: number;
    itemId: number;
    approverBy: number | null;
    approverStatus: number;
    approverDate: string | null;
    note: string;
    createdBy: number;
    createdAt: string;
    updateBy: number | null;
    updatedAt: string;
    active: boolean;
    userId: number;
    OwnerCommentUser?: DetailUser;
    approverByUser?: DetailUser;
}

interface OtherDetails {
    otherDetailId: number;
    itemId: number;
    approverBy: number | null;
    approverStatus: number;
    approverDate: string | null;
    note: string;
    createdBy: number;
    createdAt: string;
    updateBy: number | null;
    updatedAt: string;
    active: boolean;
    userId: number;
    OwnerCommentUser?: DetailUser;
    approverByUser?: DetailUser;
}

interface AuditDetailsComment {
    auditDetailId: number;
    itemId: number;
    approverStatus: number;
    approverDate: string | null;
    note: string;
    createdBy: number;
    createdAt: string;
    updateBy: number | null;
    updatedAt: string;
    active: boolean;
    OwnerCommentUser?: UserOwnerComment;
    amDetailId: amDetails;
    otherDetailId: OtherDetails;
    approverByUser?: UserApproverComment;
}

interface UserOwnerComment {
    userCode: string;
    fullname: string;
    email: string;
    position: string;
    branchId: number;
}

interface UserApproverComment {
    userCode: string;
    fullname: string;
    email: string;
    position: string;
    branchId: number;
}

interface Branch {
  branchid: number;
  name: string;
  FullAddress?: string;
  code?: string;
}
            