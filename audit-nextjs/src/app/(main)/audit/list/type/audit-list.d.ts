interface AuditStatusInfo {
  auditStatusId: number;
  statusName: string;
}

interface AuditList {
  jobId: number;
  jobNo: string;
  branchId: number;
  branchName: string;
  auditDate: string;
  status: number;
  pmCode?: string;
  statusInfo?: AuditStatusInfo;
  auditor?: {
    userCode: string;
    fullname: string;
    email: string;
  };
  districtManager?: {
    userCode: string;
    fullname: string;
    email: string;
  };
  branchManager?: {
    userCode: string;
    fullname: string;
    email: string;
  };
  createdByUser?: {
    userCode: string;
    fullname: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
  active: boolean;
}