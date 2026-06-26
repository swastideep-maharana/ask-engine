import { clerkMiddleware } from '@clerk/nextjs/server';

export default clerkMiddleware();

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html|css|js(?!on)|jpe?g|webp|png|gif|svg|css|webmanifest|co?ff2?|docx?|xlsx?|zip|pdf)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
    // Clerk auto-proxy matcher
    '/__clerk/:path*',
  ],
};
