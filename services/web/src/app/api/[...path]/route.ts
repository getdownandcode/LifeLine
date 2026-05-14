import jwt from "jsonwebtoken";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const GATEWAY_URL = process.env.GATEWAY_URL || "http://localhost:3000";
const JWT_SECRET = process.env.JWT_SECRET || "change_me_dev_secret";
const GATEWAY_TIMEOUT_MS = 10000;

type RouteContext = {
  params: {
    path: string[];
  };
};

function bearerToken() {
  return jwt.sign(
    { sub: "lifeline-web", role: "admin", scope: ["demo", "gateway"] },
    JWT_SECRET,
    { expiresIn: "2h" }
  );
}

function targetUrl(request: NextRequest, path: string[]) {
  const url = new URL(request.url);
  const target = new URL(`/api/${path.join("/")}${url.search}`, GATEWAY_URL);
  return target.toString();
}

async function proxy(request: NextRequest, context: RouteContext) {
  const requestBody = ["GET", "HEAD"].includes(request.method)
    ? undefined
    : await request.text();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GATEWAY_TIMEOUT_MS);

  try {
    const response = await fetch(targetUrl(request, context.params.path), {
      method: request.method,
      headers: {
        Authorization: `Bearer ${bearerToken()}`,
        "Content-Type": request.headers.get("content-type") || "application/json",
        "X-Correlation-ID": request.headers.get("x-correlation-id") || crypto.randomUUID(),
      },
      body: requestBody || undefined,
      signal: controller.signal,
    });

    const responseBody = await response.text();
    const contentType = response.headers.get("content-type") || "application/json";

    return new NextResponse(responseBody, {
      status: response.status,
      headers: {
        "Content-Type": contentType,
      },
    });
  } catch (error) {
    const message = error instanceof Error && error.name === "AbortError"
      ? "Gateway request timed out"
      : "Gateway request failed";

    return NextResponse.json(
      { success: false, error: { message } },
      { status: 502 }
    );
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(request: NextRequest, context: RouteContext) {
  return proxy(request, context);
}

export async function POST(request: NextRequest, context: RouteContext) {
  return proxy(request, context);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  return proxy(request, context);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  return proxy(request, context);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return proxy(request, context);
}
