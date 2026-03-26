import { NextResponse } from "next/server";

import { isDatabaseConfigured } from "@/lib/db";
import { deleteEvent, updateEvent } from "@/lib/events";
import { eventSchema } from "@/lib/validation";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: Request, { params }: Params) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { message: "MONGODB_URI is missing. Add it to start using the app." },
        { status: 503 },
      );
    }

    const { id } = await params;
    const body = await request.json();
    const input = eventSchema.parse(body);
    const event = await updateEvent(id, input);

    if (!event) {
      return NextResponse.json({ message: "Event not found." }, { status: 404 });
    }

    return NextResponse.json({ event });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ message: "Invalid event data." }, { status: 400 });
    }

    const message =
      error instanceof Error ? error.message : "Unable to update event.";

    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: Params) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { message: "MONGODB_URI is missing. Add it to start using the app." },
        { status: 503 },
      );
    }

    const { id } = await params;
    const deleted = await deleteEvent(id);

    if (!deleted) {
      return NextResponse.json({ message: "Event not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to delete event.";

    return NextResponse.json({ message }, { status: 500 });
  }
}
