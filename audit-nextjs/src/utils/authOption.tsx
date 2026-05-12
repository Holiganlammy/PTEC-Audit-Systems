// utils/authOptions.ts - เพิ่ม AzureADProvider

import type { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import AzureADProvider from "next-auth/providers/azure-ad";
import type { User } from "next-auth";

let isTokenExpired = false;

export const authOptions: AuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId: process.env.AZURE_AD_TENANT_ID!,
      
      // Custom authorization params
      authorization: {
        params: {
          scope: "openid profile email User.Read",
        },
      },
    }),

    // Credentials Provider (existing)
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        response: { label: "Response", type: "json" },
        responseLogin: { label: "Response Login", type: "json" },
        responseCondition: { label: "Response Condition", type: "text" },
      },

      async authorize(credentials): Promise<User | null> {
        try {
          // OTP Login
          if (credentials?.response) {
            type OTPResponse = {
              access_token: string;
              user: {
                userid?: string;
                UserID: string;
                UserCode: string;
                fristName: string;
                lastName: string;
                Email: string;
                img_profile: string;
                role_id: number;
                branchid: number;
                depid: number;
                role_name: string;
              };
            };
            
            const parsedResponse = JSON.parse(credentials.response) as OTPResponse;
            const user = parsedResponse.user;
            const token = parsedResponse.access_token;

            isTokenExpired = false;

            return {
              id: user.userid?.toString() ?? "",
              UserID: parseInt(user.UserID),
              UserCode: user.UserCode,
              fristName: user.fristName,
              lastName: user.lastName,
              Email: user.Email,
              access_token: token,
              img_profile: user.img_profile,
              role_id: user.role_id,
              branchid: user.branchid,
              depid: user.depid,
              loginMethod: 'otp',
              role_name: user.role_name,
            };
          }

          // Normal Login
          if (credentials?.responseCondition === 'pass' && credentials?.responseLogin) {
            type ResponseLogin = {
              access_token: string;
              user: {
                userid?: string;
                UserID: string;
                UserCode: string;
                fristName: string;
                lastName: string;
                Email: string;
                img_profile: string;
                role_id: number;
                branchid: number;
                depid: number;
                role_name: string;
              };
            };
            
            const parsedResponse = JSON.parse(credentials.responseLogin) as ResponseLogin;
            const user = parsedResponse.user;
            const token = parsedResponse.access_token;
            isTokenExpired = false;

            return {
              id: user.userid?.toString() ?? "",
              UserID: parseInt(user.UserID),
              UserCode: user.UserCode,
              fristName: user.fristName,
              lastName: user.lastName,
              Email: user.Email,
              access_token: token,
              img_profile: user.img_profile,
              role_id: user.role_id,
              branchid: user.branchid,
              depid: user.depid,
              loginMethod: 'password',
              role_name: user.role_name,
            };
          }

          throw new Error("INVALID_CREDENTIALS");
        } catch (error) {
          console.error("Authorize error:", error);
          throw error;
        }
      }
    })
  ],

  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "azure-ad") {
        try {
          const email = user.email;
          
          if (!email) {
            console.error("No email from Azure AD");
            return false;
          }

          // Validate with Audit backend
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/validate-microsoft`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email,
              azureId: user.id,
              name: user.name,
            }),
          });

          if (!response.ok) {
            console.error("User validation failed");
            return false;
          }

          const data = await response.json();
          
          // เก็บข้อมูล user จาก backend
          user.UserID = data.user.UserID;
          user.UserCode = data.user.UserCode;
          user.fristName = data.user.fristName;
          user.lastName = data.user.lastName;
          user.access_token = data.access_token;
          user.role_id = data.user.role_id;
          user.branchid = data.user.branchid;
          user.depid = data.user.depid;
          user.role_name = data.user.role_name;
          user.img_profile = data.user.img_profile;
          user.loginMethod = 'sso';

          return true;
        } catch (error) {
          console.error("Azure AD sign in error:", error);
          return false;
        }
      }

      return true;
    },

    async jwt({ token, user, account, trigger }) {
      // ✅ Azure AD Login
      if (account?.provider === "azure-ad" && user) {
        token.UserID = user.UserID;
        token.UserCode = user.UserCode;
        token.fristName = user.fristName;
        token.lastName = user.lastName;
        token.Email = user.Email;
        token.access_token = user.access_token;
        token.img_profile = user.img_profile;
        token.role_id = user.role_id;
        token.branchid = user.branchid;
        token.depid = user.depid;
        token.loginMethod = 'sso';
        token.role_name = user.role_name;
        token.accessTokenExpires = Date.now() + 240 * 60 * 1000; // 4 hours
        isTokenExpired = false;
      }

      // Credentials Login
      if (user && account?.type === "credentials") {
        token.UserID = user.UserID;
        token.UserCode = user.UserCode;
        token.fristName = user.fristName;
        token.lastName = user.lastName;
        token.Email = user.Email;
        token.access_token = user.access_token;
        token.img_profile = user.img_profile;
        token.role_id = user.role_id;
        token.branchid = user.branchid;
        token.depid = user.depid;
        token.loginMethod = user.loginMethod;
        token.role_name = user.role_name;
        token.accessTokenExpires = Date.now() + 240 * 60 * 1000; // 4 ชั่วโมง
      }

      if (token.accessTokenExpires && Date.now() > (token.accessTokenExpires as number)) {
        if (!isTokenExpired) {
          console.log("⚠️ Token expired in JWT callback");
          isTokenExpired = true;
        }
        return { error: "TokenExpired" };
      }

      if (isTokenExpired) {
        return { error: "TokenExpired" };
      }

      // Refresh user data
      if (trigger === "update" && token.UserCode) {
        const lastRefresh = token.lastRefresh as number | undefined;
        const now = Date.now();
        
        if (lastRefresh && (now - lastRefresh) < 30000) {
          return token;
        }

        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);

          const response = await fetch(
            `${process.env.Localhost_API}/GetUserWithRoles?UserCode=${token.UserCode}`,
            {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token.access_token}`,
              },
              cache: 'no-store',
              signal: controller.signal
            }
          );

          clearTimeout(timeoutId);
          
          if (response.status === 401) {
            isTokenExpired = true;
            return {};
          }
          
          if (response.ok) {
            const result = await response.json();
            
            if (result.success && result.data && result.data.length > 0) {
              const userData = result.data[0];
              
              token.fristName = userData.fristName;
              token.lastName = userData.lastName;
              token.Email = userData.Email;
              token.img_profile = userData.img_profile;
              token.role_id = userData.role_id;
              token.branchid = userData.branchid;
              token.depid = userData.depid;
              token.role_name = userData.role_name;
              token.lastRefresh = now;
            }
          }
        } catch (error) {
          console.error("Error refreshing user data:", error);
        }
      }
      
      return token;
    },

    async session({ session, token }) {
      if (!token || Object.keys(token).length === 0 || token.error === "TokenExpired") {
        return {
          ...session,
          user: undefined,
          expires: new Date(0).toISOString(),
          error: "TokenExpired",
        };
      }

      if (typeof token === 'object') {
        session.user = {
          ...(session.user || {}),
          UserID: token.UserID as number,
          UserCode: token.UserCode as string,
          fristName: token.fristName as string,
          lastName: token.lastName as string,
          Email: token.Email as string,
          access_token: token.access_token as string,
          img_profile: token.img_profile as string,
          role_id: token.role_id as number,
          branchid: token.branchid as number,
          depid: token.depid as number,
          loginMethod: token.loginMethod as string,
          role_name: token.role_name as string,
        };
      }
      
      return session;
    },
  },

  events: {
    async signOut(message) {
      console.log("User signed out:", message);
      isTokenExpired = false;
    },
  },

  session: {
    strategy: 'jwt',
    maxAge: 30 * 60, // 30 minutes
  },

  pages: {
    signIn: '/login',
  },
};