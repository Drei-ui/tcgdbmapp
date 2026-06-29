import { updateSession } from "@/lib/supabase/middleware";
import { type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for static Next.js assets.
     * API routes are included so session tokens are refreshed on API calls.
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
