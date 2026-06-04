// src/lib/auth/logout.ts
import { signOut } from "next-auth/react";

export async function logout(accessToken?: string) {
  try {
    if (accessToken) {
      await fetch(`${process.env.PORTAL_API_URL}/logout`, {
        method: 'POST',
        body: JSON.stringify({access_token: accessToken}),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        cache: "no-store",
      });
      
      console.log('Token revoked from backend');
    }
  } catch (error) {
    console.error('Backend logout error:', error);
  } finally {
    await signOut({ 
        redirect: false
    });
  }
}