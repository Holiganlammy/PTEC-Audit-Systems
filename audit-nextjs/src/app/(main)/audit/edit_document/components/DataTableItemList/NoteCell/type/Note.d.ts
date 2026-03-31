interface AuditComment {
  id: number;
  itemId: number;
  userId: number;
  author: string;
  authorPosition?: string;
  text: string;
  approverStatus: number | null; // null=comment ปกติ, 0=รออนุมัติ, 1=อนุมัติ, 2=ไม่อนุมัติ
  approverBy?: number;
  approverName?: string;
  approverPosition?: string;
  approverUsername?: string;
  approverDate?: string;
  requireApprovalFromUserCode?: string; // userCode ของคนที่มีสิทธิ์อนุมัติ
  requireApprovalFromName?: string; // ชื่อคนที่มีสิทธิ์อนุมัติ
  createdAt: string;
  updatedAt: string;
}


interface AuditDetailsComment {
  auditDetailId?: number;
  amDetailId?: number;
  otherDetailId?: number;
  itemId: number;
  userId: number;
  note: string;
  approverStatus: number | null;
  approverBy?: number;
  approverDate?: string;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
  OwnerCommentUser?: {
    fullname: string;
    position?: string;
  };
  approverByUser?: {
    fullname: string;
    position?: string;
    userCode?: string;
  };
  requireApprovalFrom?: {
    userCode: string;
    fullname: string;
  };
}

interface AuditItem {
  item_id: number;
  job_id: number;
  category_item_id: number;
  category_name: string;
  inspection_date: string;
  item_status: number;
  item_status_edit: number;
  remarks: string;
  note_1?: AuditComment[];
  note_2?: AuditComment[];     
  note_3?: AuditComment[];     
  tagged_users?: TaggedUser[];
  created_at: string;
  updated_at: string;
  active: boolean;
}

// ... rest of the code remains the same ...