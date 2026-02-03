// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// กำหนด paths ที่เป็น public (ไม่ต้อง login)
const publicPaths = ["/login"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ดึง token จาก NextAuth
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });
  console.log("Middleware - Token:", token);
  const isAuthenticated = !!token;

  // ตรวจสอบว่าเป็น public path หรือไม่
  const isPublicPath = publicPaths.some((path) =>
    pathname.startsWith(path)
  );

  // ถ้ายังไม่ login และไม่ใช่ public path
  if (!isAuthenticated && !isPublicPath) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ถ้า login แล้วและพยายามเข้าหน้า login
  if (isAuthenticated && isPublicPath) {
    return NextResponse.redirect(new URL("/home", request.url));
  }

  return NextResponse.next();
}

// กำหนด paths ที่ต้องการให้ middleware ทำงาน
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|public).*)",
  ],
};
