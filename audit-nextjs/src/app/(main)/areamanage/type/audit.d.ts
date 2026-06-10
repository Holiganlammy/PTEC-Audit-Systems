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

interface AuditStatusInfo {
    auditStatusId: number;
    statusName: string;
}

interface AuditJobData {
    active: boolean;
    additionalNotes: string;
    address: string;
    auditDate: string;
    auditType: "visit" | "online";
    branchId: number;
    branchName: string;
    createdAt: string;
    excelFileName: string | null;
    excelFilePath: string | null;
    jobId: number;
    jobNo: string;
    pmCode: string;
    status: number;
    statusInfo?: AuditStatusInfo;
    updatedAt: string;
    auditor: Auditor;
    branchManager: branchManager;
    districtManager: districtManager;
    createdByUser: CreatedByUser;
    positionType: string;
    jobCreatedEmailSentAt: string | null;
    jobCreatedEmailSentBy: number | null;
}

interface Auditor {
    branchId: number;
    email: string;
    firstName: string;
    lastName: string;
    fullname: string;
    position: string;
    userCode: string;
    userId: number;
}

interface branchManager {
    branchId: number;
    email: string;
    firstName: string;
    lastName: string;
    fullname: string;
    position: string;
    userCode: string;
    userId: number;
}

interface districtManager {
    branchId: number;
    email: string;
    firstName: string;
    lastName: string;
    fullname: string;
    position: string;
    userCode: string;
    userId: number;
}

interface CreatedByUser {
    branchId: number;
    email: string;
    fullname: string;
    position: string;
    userCode: string;
    userId: number;
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

interface AMItemData {
    amComments: amComments[];
    itemId: number;
    jobId: number;
    categoryItemId: number;
    inspectionDate: string;
    itemStatus: number;
    itemStatusEdit: number;
    remarks: string;
    createdBy: number;
    createdAt: string;
    updateBy: number | null;
    updatedAt: string;
    active: boolean;
    categoryItem?: AuditCategoryItem;
    amCheckerComments : amCheckerComment[];
    otherComments: otherComments[];
    headerChecklistStatus?: number;
    headerChecklistDetail?: string;
    headerChecklistBy?: number;
    headerChecklistAt?: Date;
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

interface amComments {
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

interface amCheckerComment {
    amCheckerDetailId: number;
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

interface otherComments {
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

interface auditCommentsComment {
    amCheckerDetailId: number;
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
    amCheckerDetailId: auditComments;
    otherDetailId: otherComments;
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
            