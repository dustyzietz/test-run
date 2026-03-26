import { connectToDatabase, isDatabaseConfigured } from "@/lib/db";
import { type EventInput } from "@/lib/validation";
import { EventModel } from "@/models/Event";
import { type EventRecord } from "@/types/event";

function serializeEvent(event: {
  _id: { toString(): string };
  title: string;
  description?: string;
  date: Date;
  amount: number;
  transactionType: "spent" | "earned";
  category: string;
  isHealthy: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    _id: event._id.toString(),
    title: event.title,
    description: event.description ?? "",
    date: event.date.toISOString(),
    amount: event.amount,
    transactionType: event.transactionType,
    category: event.category,
    isHealthy: event.isHealthy,
    createdAt: event.createdAt.toISOString(),
    updatedAt: event.updatedAt.toISOString(),
  } satisfies EventRecord;
}

export async function getEvents() {
  if (!isDatabaseConfigured()) {
    return [] as EventRecord[];
  }

  await connectToDatabase();

  const events = await EventModel.find({}).sort({ date: 1, createdAt: -1 }).lean();

  return events.map((event) =>
    serializeEvent({
      ...event,
      _id: event._id,
    }),
  );
}

export async function createEvent(input: EventInput) {
  await connectToDatabase();

  const event = await EventModel.create({
    ...input,
    date: new Date(input.date),
  });

  return serializeEvent(event);
}

export async function updateEvent(id: string, input: EventInput) {
  await connectToDatabase();

  const event = await EventModel.findByIdAndUpdate(
    id,
    {
      ...input,
      date: new Date(input.date),
    },
    {
      new: true,
      runValidators: true,
    },
  );

  if (!event) {
    return null;
  }

  return serializeEvent(event);
}

export async function deleteEvent(id: string) {
  await connectToDatabase();

  const event = await EventModel.findByIdAndDelete(id);
  return Boolean(event);
}
