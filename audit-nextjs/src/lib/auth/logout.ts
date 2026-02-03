// src/lib/auth/logout.ts
import client from "@/lib/axios/interceptors";
import { signOut } from "next-auth/react";

export async function logout(accessToken?: string) {
  try {
    if (accessToken) {
      await client.post('/logout', {
        access_token: accessToken
      });
      
      console.log('✅ Token revoked from backend');
    }
  } catch (error) {
    console.error('❌ Backend logout error:', error);
  } finally {
    await signOut({ 
        redirect: false
    });
  }
}