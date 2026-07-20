interface DraftHeader {
  Branch: string;
  Firstname: string;
  Lastname: string;
  Date: string;
  PMCode: string;
  Address: string;
  Auditor: string;
  DistrictManager: string;
  BranchManager?: string;
  AdditionalNotes?: string;
  BranchAssignment?: string;
  Type: "visit" | "online";
}