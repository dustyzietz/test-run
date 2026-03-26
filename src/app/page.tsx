import { CalendarApp } from "@/components/calendar-app";
import { isDatabaseConfigured } from "@/lib/db";
import { getEvents } from "@/lib/events";

export const dynamic = "force-dynamic";

export default async function Home() {
  const dbConfigured = isDatabaseConfigured();
  const initialEvents = dbConfigured ? await getEvents() : [];

  return (
    <main className="flex-1">
      <CalendarApp initialEvents={initialEvents} dbConfigured={dbConfigured} />
    </main>
  );
}
