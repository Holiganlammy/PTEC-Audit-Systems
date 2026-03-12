// middleware.ts - Audit System with Portal SSO (FIXED for Next.js 15+)
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

// Bypass SSL verification for development
if (process.env.NODE_ENV === 'development' || process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const secret = process.env.NEXTAUTH_SECRET;

// Cache for menu permissions
const menuCache = new Map<string, { paths: string[]; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Cache for Portal token validation
interface UserData {
  UserID: number;
  UserCode: string;
  Fullname: string;
  Email: string;
  role_id: number;
  [key: string]: unknown;
}

interface TokenValidationEntry {
  isValid: boolean;
  timestamp: number;
  userData?: UserData;
}

const tokenValidationCache = new Map<string, TokenValidationEntry>();
const TOKEN_VALIDATION_CACHE_TTL = 2 * 60 * 1000; // 2 minutes

/**
 * Check if user has valid session in Portal
 */
async function validatePortalToken(token: string): Promise<{ isValid: boolean; userData?: UserData }> {
  const cached = tokenValidationCache.get(token);
  if (cached && Date.now() - cached.timestamp < TOKEN_VALIDATION_CACHE_TTL) {
    return { isValid: cached.isValid, userData: cached.userData };
  }

  try {
    const res = await fetch(`${process.env.PORTAL_API_URL}/validate-token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ source: 'audit' }),
      cache: "no-store",
    });

    if (res.ok) {
      const data = await res.json();
      tokenValidationCache.set(token, {
        isValid: true,
        userData: data.user,
        timestamp: Date.now()
      });

      return { isValid: true, userData: data.user };
    } else {
      console.log('[SSO] Portal token is invalid or expired');
      tokenValidationCache.delete(token);
      return { isValid: false };
    }
  } catch (error) {
    console.error('[SSO] Error validating Portal token:', error);
    return { isValid: false };
  }
}

/**
 * Fetch accessible paths from Portal API
 */
async function fetchUserAccessiblePaths(
  userId: number, 
  roleId: number,
  token: string = ""
) {
  const cacheKey = `${userId}-${roleId}`;
  const cached = menuCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(`[RBAC] Using cached paths for user ${userId} (role ${roleId})`);
    return cached.paths;
  }

  try {
    console.log(`[RBAC] Fetching menu for user ${userId}...`);

    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/menu_audit/check-permission`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ 
        UserID: userId,
      }),
      cache: "no-store",
    });
    console.log(res)
    if (!res.ok) {
      console.error(`[RBAC] Fetch menu fail for user ${userId}, status: ${res.status}`);
      
      if (res.status === 401) {
        console.error(`[AUTH] Token expired for user ${userId}`);
        return null;
      }
      
      return [];
    }

    const menus = await res.json();
    console.log(menus.data)
    
    interface MenuItem {
      path: string;
      [key: string]: unknown;
    }
    
    const accessiblePaths = (menus.data || [])
      .filter((m: MenuItem) => m.path !== null && m.path !== undefined && m.path !== "")
      .map((m: MenuItem) => m.path);

    menuCache.set(cacheKey, {
      paths: accessiblePaths,
      timestamp: Date.now()
    });

    console.log(`[RBAC] User ${userId} (role ${roleId}) accessible paths (${accessiblePaths.length})`);
    return accessiblePaths;
  } catch (err) {
    console.error("[RBAC] Middleware fetch error:", err);
    return [];
  }
}

/**
 * Check if requested path is in allowed paths
 */
function isPathAllowed(requestPath: string, allowedPaths: string[]): boolean {
  const cleanRequestPath = requestPath.split("?")[0].toLowerCase();

  for (const allowedPath of allowedPaths) {
    const cleanAllowedPath = allowedPath.split("?")[0].toLowerCase();

    if (cleanRequestPath === cleanAllowedPath) {
      return true;
    }

    if (cleanAllowedPath.endsWith("/*")) {
      const basePath = cleanAllowedPath.slice(0, -2);
      if (cleanRequestPath === basePath || cleanRequestPath.startsWith(basePath + "/")) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Try to get Portal token from cookies (for SSO)
 */
function getPortalTokenFromCookies(req: NextRequest): string | null {
  const portalToken = req.cookies.get('portal-token')?.value 
    || req.cookies.get('next-auth.session-token')?.value
    || req.cookies.get('__Secure-next-auth.session-token')?.value;
  
  return portalToken || null;
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const normalizedPathname = pathname.toLowerCase();

  // Skip static files
  if (
    pathname.startsWith('/_next/static') ||
    pathname.startsWith('/.well-known/appspecific/com.chrome.devtools.json') ||
    pathname.startsWith('/_next/image') ||
    pathname.startsWith('/static') ||
    pathname === '/favicon.ico' ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.jpeg') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.ico')
  ) {
    return NextResponse.next();
  }

  // Public paths
  const publicPaths = [
    "/login", 
    "/forget_password", 
    "/reset-password", 
    "/unauthorized",
    "/api/auth",
  ];
  
  // Home page
  // NOTE: allow optional trailing slash (e.g. /home/)
  // and any nested route under /home without RBAC menu checks.
  if (
    normalizedPathname === "/" ||
    normalizedPathname === "/home" ||
    normalizedPathname.startsWith("/home/")
  ) {
    // Canonicalize mixed-case paths (e.g. /Home -> /home) to avoid 404s
    // and ensure consistent routing.
    if (pathname !== normalizedPathname) {
      const url = req.nextUrl.clone();
      url.pathname = normalizedPathname;
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }
  
  if (publicPaths.some((path) => normalizedPathname.startsWith(path))) {
    return NextResponse.next();
  }

  // 1. Check Audit token (NextAuth session)
  const token = await getToken({ req, secret });

  // 2. If no Audit token, check Portal token (SSO)
  if (!token) {
    const portalToken = getPortalTokenFromCookies(req);
    
    if (portalToken) {
      const validation = await validatePortalToken(portalToken);
      
      if (validation.isValid && validation.userData) {
        console.log('[SSO] Portal token valid, redirecting to SSO login...');
        const ssoLoginUrl = new URL('/api/auth/sso-login', req.url);
        ssoLoginUrl.searchParams.set('token', portalToken);
        ssoLoginUrl.searchParams.set('redirect', pathname);
        
        return NextResponse.redirect(ssoLoginUrl);
      } else {
        console.log('[SSO] Portal token validation failed');
      }
    }
    
    // No valid token at all -> redirect to login
    console.log(`[AUTH]  No valid token for path: ${pathname}`);
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("redirect", normalizedPathname);
    return NextResponse.redirect(loginUrl);
  }

  const userId = token.UserID || token.userid || token.sub;
  const roleId = token.role_id;

  if (!userId) {
    console.log(`[AUTH] ❌ No userId in token for path: ${pathname}`);
    return NextResponse.redirect(new URL("/unauthorized", req.url));
  }

  // 4. Fetch accessible paths
  const allowedPaths = await fetchUserAccessiblePaths(
    Number(userId), 
    Number(roleId),
    String(token.access_token || "")
  );

  // 5. Handle token expiry
  if (allowedPaths === null) {
    console.log("[AUTH] Token expired (401 from API)");
    tokenValidationCache.clear();
    menuCache.clear();
    
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("redirect", normalizedPathname);
    loginUrl.searchParams.set("reason", "session_expired");
    return NextResponse.redirect(loginUrl);
  }

  if (allowedPaths.length === 0) {
    console.log(`[RBAC] No accessible paths for user ${userId}`);
    return NextResponse.redirect(new URL("/unauthorized", req.url));
  }

  const isAllowed = isPathAllowed(normalizedPathname, allowedPaths);

  if (!isAllowed) {
    console.warn(`[RBAC] ❌ User ${userId} (role ${roleId}) DENIED access to ${pathname}`);
    return NextResponse.redirect(new URL("/unauthorized", req.url));
  }

  console.log(`[RBAC] ✅ User ${userId} (role ${roleId}) ALLOWED to access ${pathname}`);
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.svg|.*\\.ico|\\.well-known/appspecific/com.chrome.devtools.json).*)",
  ],
};