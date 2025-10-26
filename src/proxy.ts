import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: "",
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value: "",
            ...options,
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Define public and auth routes
  const publicRoutes = ["/search"];
  const authRoutes = ["/login"];

  // If user is not logged in and tries to access a protected route, redirect to login
  if (
    !user &&
    !publicRoutes.some((route) => pathname.startsWith(route)) &&
    !authRoutes.some((route) => pathname.startsWith(route))
  ) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // If user is logged in
  if (user) {
    const role = user.app_metadata?.role;

    // Redirect away from login page if already logged in
    if (authRoutes.some((route) => pathname.startsWith(route))) {
      if (role === "admin") {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      } else if (role === "teacher") {
        return NextResponse.redirect(new URL("/classes", request.url));
      }
      // Fallback for users with no/other roles
      return NextResponse.redirect(new URL("/", request.url));
    }

    // Role-based access control
    // If a non-admin tries to access an admin route, redirect them
    if (pathname.startsWith("/dashboard") && role !== "admin") {
      return NextResponse.redirect(new URL("/classes", request.url));
    }

    // A teacher can ONLY access teacher routes (e.g., /classes)
    const isTeacherRoute = pathname.startsWith("/classes");
    if (role === "teacher" && !isTeacherRoute) {
      return NextResponse.redirect(new URL("/classes", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
