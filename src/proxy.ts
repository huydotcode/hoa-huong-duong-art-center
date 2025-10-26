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
  const publicRoutes = ["/search", "/parent"];
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
        return NextResponse.redirect(new URL("/admin/dashboard", request.url));
      } else if (role === "teacher") {
        return NextResponse.redirect(new URL("/teacher/classes", request.url));
      }
      // Fallback for users with no/other roles
      return NextResponse.redirect(new URL("/teacher/classes", request.url));
    }

    // Redirect from root path based on role
    if (pathname === "/") {
      if (role === "admin") {
        return NextResponse.redirect(new URL("/admin/dashboard", request.url));
      } else if (role === "teacher") {
        return NextResponse.redirect(new URL("/teacher/classes", request.url));
      }
    }

    // Role-based access control
    // If a non-admin tries to access an admin route, redirect them
    if (pathname.startsWith("/admin/dashboard") && role !== "admin") {
      return NextResponse.redirect(new URL("/teacher/classes", request.url));
    }

    // A teacher can ONLY access teacher routes (e.g., /classes)
    const isTeacherRoute = pathname.startsWith("/teacher/classes");
    if (role === "teacher" && !isTeacherRoute && pathname !== "/") {
      return NextResponse.redirect(new URL("/teacher/classes", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - assets (static assets like images)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|assets).*)",
  ],
};
