import { NextResponse, type NextRequest } from "next/server";

export function createNonce() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function middleware(request: NextRequest) {
  const value = createNonce();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", value);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  const isDevelopment = process.env.NODE_ENV === "development";
  const scriptSrc = isDevelopment ? "'self' 'unsafe-eval'" : "'self'";
  const csp = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self' https://discord.com",
    "img-src 'self' data:",
    "style-src 'self' 'unsafe-inline'",
    `script-src ${scriptSrc} 'nonce-${value}'`,
    "connect-src 'self' https://discord.com https://*.discord.com",
  ].join("; ");
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  if (process.env.NODE_ENV === "production" && request.nextUrl.protocol === "https:") {
    response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  return response;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
