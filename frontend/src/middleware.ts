import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ① 静的アセット・APIルートは除外
  if (pathname.startsWith("/_next") || pathname.startsWith("/api") || pathname.startsWith("/favicon.ico") || pathname.startsWith("/static")) {
    return NextResponse.next();
  }

  // ② 認証不要ページ（ログイン・登録）
  if (["/login", "/signup"].includes(pathname)) {
    return NextResponse.next();
  }

  // ③ Supabase Auth Cookie 検出（Next.js 15対応版）
  let session = null;
  for (const [key, cookie] of req.cookies) {
    if (key.includes("auth-token")) {
      session = cookie.value;
      break;
    }
  }

  if (!session) {
    console.log("middleware: no session found, redirecting to /login");
    const redirectUrl = new URL("/login", req.url);
    redirectUrl.searchParams.set("redirectedFrom", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

// middleware 適用範囲
export const config = {
  matcher: ["/:path*", "/dashboard/:path*", "/articles/:path*", "/recommendations/:path*"],
};
