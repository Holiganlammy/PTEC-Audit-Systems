// app/api/auth/sso-login/route.ts - Simplified SSO Login
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const portalToken = searchParams.get('token');
    const redirect = searchParams.get('redirect') || '/home';

    if (!portalToken) {
      console.log('[SSO] No portal token provided');
      return NextResponse.redirect(new URL('/login?error=no_token', request.url));
    }

    console.log('[SSO] Redirecting to credentials callback with SSO token...');

    const callbackUrl = new URL('/api/auth/callback/credentials', request.url);
    callbackUrl.searchParams.set('callbackUrl', redirect);

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>SSO Login...</title>
        </head>
        <body>
          <p>Authenticating via Portal SSO...</p>
          <form id="ssoForm" method="post" action="${callbackUrl.toString()}">
            <input type="hidden" name="ssoToken" value="${portalToken}" />
            <input type="hidden" name="callbackUrl" value="${redirect}" />
          </form>
          <script>
            document.getElementById('ssoForm').submit();
          </script>
        </body>
      </html>
    `;

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
      },
    });

  } catch (error) {
    console.error('[SSO] SSO login error:', error);
    return NextResponse.redirect(new URL('/login?error=sso_error', request.url));
  }
}