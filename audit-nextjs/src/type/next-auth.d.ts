import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      UserID: number;
      UserCode: string;
      fristName?: string;
      lastName?: string;
      Email?: string;
      access_token?: string;
      img_profile?: string;
      role_id?: number;
      branchid?: number;
      depid?: number;
      loginMethod?: string;
      role_name?: string;
    };
  }
  interface User {
    UserID: number;
    UserCode: string;
    fristName?: string;
    lastName?: string;
    Email?: string;
    access_token: string;
    img_profile?: string;
    role_id?: number;
    branchid?: number;
    accessTokenExpires?: number;
    depid?:number;
    loginMethod?: string;
    role_name?: string;
  }

  interface JWT { 
    UserID: number;
    UserCode: string;
    fristName?: string;
    lastName?: string;
    Email?: string;
    access_token?: string;
    img_profile?: string;
    role_id?: number;
    branchid?: number;
    depid?: number;
    loginMethod?: string;
    role_name?: string;
    accessTokenExpires?: number;
    lastRefresh?: number;
  }
}
