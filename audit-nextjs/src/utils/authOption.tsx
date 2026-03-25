// utils/authOptions.ts - with Portal SSO support
import type { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import type { User } from "next-auth";

let isTokenExpired = false;

export const authOptions: AuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        response: { label: "Response", type: "json" },
        responseLogin: { label: "Response Login", type: "json" },
        responseCondition: { label: "Response Condition", type: "text" },
        // เพิ่ม SSO credential
        ssoToken: { label: "SSO Token", type: "text" },
      },

      async authorize(credentials): Promise<User | null> {
        try {
          // ============================================
          // SSO Login from Portal
          // ============================================
          if (credentials?.ssoToken) {
            try {
              // Validate Portal token
              const validateRes = await fetch(`${process.env.PORTAL_API_URL}/api/validate`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${credentials.ssoToken}`,
                },
                body: JSON.stringify({ access_token: credentials.ssoToken }),
              });
              console.log('[SSO] Validating Portal token...');
              if (!validateRes.ok) {
                console.log('[SSO] Portal token validation failed');
                return null;
              }

              const data = await validateRes.json();
              const portalUser = data.user;

              if (!portalUser) {
                console.log('[SSO] No user data from Portal');
                return null;
              }

              console.log('[SSO] Portal token validated, creating Audit session for:', portalUser.UserCode);

              isTokenExpired = false;

              return {
                id: portalUser.UserID.toString(),
                UserID: portalUser.UserID,
                UserCode: portalUser.UserCode,
                fristName: portalUser.Fullname?.split(' ')[0] || portalUser.UserCode,
                lastName: portalUser.Fullname?.split(' ').slice(1).join(' ') || '',
                Email: portalUser.Email,
                access_token: credentials.ssoToken,
                img_profile: portalUser.img_profile || '',
                role_id: portalUser.role_id,
                branchid: portalUser.BranchID || 0,
                depid: portalUser.depid || 0,
                loginMethod: 'sso',
              };
            } catch (error) {
              console.error('[SSO] Error during SSO login:', error);
              return null;
            }
          }

          // ============================================
          // OTP Login (existing)
          // ============================================
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

          // ============================================
          // Normal Login (existing)
          // ============================================
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
    async jwt({ token, user, trigger }) {
      if (user) {
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
        return {};
      }

      if (isTokenExpired) {
        return {};
      }

      if (trigger === "update" && token.UserCode) {
        const lastRefresh = token.lastRefresh as number | undefined;
        const now = Date.now();
        
        if (lastRefresh && (now - lastRefresh) < 30000) {
          console.log("Skip refresh (too soon)");
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
            console.log("Token invalid (401)");
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

              console.log("User data refreshed successfully");
            }
          }
        } catch (error) {
          console.error("Error refreshing user data:", error);
        }
      }
      
      return token;
    },

    async session({ session, token }) {
      if (!token || Object.keys(token).length === 0) {
        console.log("Empty token in session callback");
        return {
          ...session,
          user: undefined,
          expires: new Date(0).toISOString(),
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
    maxAge: 30 * 60, // 30 นาที
  },

  pages: {
    signIn: '/login',
  },
};