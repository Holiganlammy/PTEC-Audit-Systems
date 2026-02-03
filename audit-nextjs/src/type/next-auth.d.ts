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
  }
}
