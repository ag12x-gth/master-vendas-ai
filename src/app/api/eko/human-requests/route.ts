import { NextResponse } from "next/server";
import { z } from "zod";

import {
  getPendingHumanRequests,
  resolveHumanRequest,
  rejectHumanRequest,
} from "../../../../lib/ai/eko-callbacks";

const respondSchema = z.object({
  requestId: z.string().min(1),
  result: z.unknown().optional(),
  error: z.string().optional(),
});

export async function GET() {
  const requests = getPendingHumanRequests();
  return NextResponse.json({ requests });
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = respondSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { requestId, result, error } = parsed.data;

  if (error) {
    rejectHumanRequest(requestId, new Error(error));
  } else {
    resolveHumanRequest(requestId, result ?? true);
  }

  return NextResponse.json({ ok: true });
}
