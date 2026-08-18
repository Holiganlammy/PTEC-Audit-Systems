// src/lib/auth/logout.ts
import { signOut } from "next-auth/react";
import { HAD_SESSION_KEY } from "@/app/CheckSession";

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
    // เคลียร์ก่อน signOut กัน CheckSession เข้าใจผิดว่า session หมดอายุแล้วขึ้น alert dialog
    // ทั้งที่ user เป็นคนกด logout เอง
    sessionStorage.removeItem(HAD_SESSION_KEY);
    await signOut({
        redirect: false
    });
  }
}