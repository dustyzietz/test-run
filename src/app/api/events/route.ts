import { NextResponse } from "next/server";

import { isDatabaseConfigured } from "@/lib/db";
import { createEvent, getEvents } from "@/lib/events";
import { eventSchema } from "@/lib/validation";

export async function GET() {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { message: "MONGODB_URI is missing. Add it to start using the app." },
        { status: 503 },
      );
    }

    const events = await getEvents();
    return NextResponse.json({ events });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load events.";

    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { message: "MONGODB_URI is missing. Add it to start using the app." },
        { status: 503 },
      );
    }

    const body = await request.json();
    const input = eventSchema.parse(body);
    const event = await createEvent(input);

    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ message: "Invalid event data." }, { status: 400 });
    }

    const message =
      error instanceof Error ? error.message : "Unable to create event.";

    return NextResponse.json({ message }, { status: 500 });
  }
}
