export interface authValidationResponse {
  success: boolean;
  valid: boolean;
  user?: {
    userId: string;
    userCode: string;
    username: string;
    role: number;
    email: string;
    fristName: string;
    lastName: string;
    img_profile: string | null;
    branchid: number;
    depid: number;
    source: string;
    loginAt: string;
  };
}
