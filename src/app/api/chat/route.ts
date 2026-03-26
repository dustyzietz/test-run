import { NextResponse } from "next/server";
import { z } from "zod";

import { isDatabaseConfigured } from "@/lib/db";
import { getEvents } from "@/lib/events";
import { answerEventQuestion } from "@/lib/event-chat";

const chatSchema = z.object({
  question: z.string().trim().min(1).max(500),
});

export async function POST(request: Request) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { message: "MONGODB_URI is missing. Add it to start using chat." },
        { status: 503 },
      );
    }

    const body = await request.json();
    const { question } = chatSchema.parse(body);
    const events = await getEvents();
    const response = answerEventQuestion(question, events);

    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { message: "Ask a shorter question with at least one character." },
        { status: 400 },
      );
    }

    const message =
      error instanceof Error ? error.message : "Unable to answer question.";

    return NextResponse.json({ message }, { status: 500 });
  }
}
