import { NextResponse } from "next/server";

export function middleware(request) {
  // Temporarily disable auth check:
  return NextResponse.next();
}

export const config = {
  matcher: ["/moodboard/:path*", "/journal/:path*"],
};
