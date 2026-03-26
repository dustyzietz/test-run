import { NextResponse } from "next/server";
import { z } from "zod";
import OpenAI from "openai";

import { isDatabaseConfigured } from "@/lib/db";
import { EVENT_ANALYTICS_TOOLS, runEventAnalyticsTool } from "@/lib/event-analytics";
import { getEvents } from "@/lib/events";

const chatSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(4000),
      }),
    )
    .min(1)
    .max(20),
});

export async function POST(request: Request) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { message: "MONGODB_URI is missing. Add it to start using chat." },
        { status: 503 },
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { message: "OPENAI_API_KEY is missing. Add it to enable AI chat." },
        { status: 503 },
      );
    }

    const body = await request.json();
    const { messages } = chatSchema.parse(body);
    const events = await getEvents();
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const input = [
      {
        role: "system" as const,
        content: [
          {
            type: "input_text" as const,
            text:
              "You are an analytics assistant for a personal calendar app. Answer only from the provided tool results. Do not invent numbers. Prefer tools over guessing. Keep responses concise but helpful. When the user asks follow-up questions, use the prior conversation to resolve what they mean. If a question is ambiguous, say what assumption you made. The data contains event records with dates, amounts, spent or earned transaction types, categories, and healthy flags.",
          },
        ],
      },
      ...messages.map((message) => ({
        role: message.role,
        content: [{ type: "input_text" as const, text: message.content }],
      })),
    ];

    let response = await client.responses.create({
      model: process.env.OPENAI_MODEL ?? "gpt-5-mini",
      input,
      tools: EVENT_ANALYTICS_TOOLS,
      parallel_tool_calls: false,
    });

    for (let attempts = 0; attempts < 5; attempts += 1) {
      const toolCalls = response.output.filter(
        (item): item is Extract<(typeof response.output)[number], { type: "function_call" }> =>
          item.type === "function_call",
      );

      if (toolCalls.length === 0) {
        break;
      }

      response = await client.responses.create({
        model: process.env.OPENAI_MODEL ?? "gpt-5-mini",
        previous_response_id: response.id,
        input: toolCalls.map((toolCall) => ({
          type: "function_call_output" as const,
          call_id: toolCall.call_id,
          output: runEventAnalyticsTool(toolCall.name, toolCall.arguments, events),
        })),
        tools: EVENT_ANALYTICS_TOOLS,
        parallel_tool_calls: false,
      });
    }

    const answer = response.output_text.trim();

    if (!answer) {
      throw new Error("The AI did not return an answer.");
    }

    return NextResponse.json({ answer });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { message: "Send between 1 and 20 chat messages with text content." },
        { status: 400 },
      );
    }

    const message =
      error instanceof Error ? error.message : "Unable to answer question.";

    return NextResponse.json({ message }, { status: 500 });
  }
}
