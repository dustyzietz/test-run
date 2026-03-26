import { endOfMonth, endOfWeek, format, isAfter, isBefore, isSameDay, startOfMonth, startOfToday, startOfWeek } from "date-fns";
import { z } from "zod";

import { type EventRecord, type TransactionType } from "@/types/event";

type TimeframeName = "all" | "today" | "this_week" | "this_month" | "next_month";

type Timeframe =
  | {
      label: string;
      matches(date: Date): boolean;
    }
  | null;

const timeframeSchema = z
  .enum(["all", "today", "this_week", "this_month", "next_month"])
  .default("all");

const transactionSchema = z.enum(["spent", "earned"]);

const countDaysSchema = z.object({
  timeframe: timeframeSchema,
  transactionType: transactionSchema.optional(),
  minAmount: z.number().min(0).optional(),
});

const summarySchema = z.object({
  timeframe: timeframeSchema,
  transactionType: transactionSchema.optional(),
});

const categoriesSchema = z.object({
  timeframe: timeframeSchema,
  transactionType: transactionSchema.optional(),
  limit: z.number().int().min(1).max(10).default(5),
});

const busiestDaysSchema = z.object({
  timeframe: timeframeSchema,
  limit: z.number().int().min(1).max(10).default(5),
});

const recentEventsSchema = z.object({
  timeframe: timeframeSchema,
  limit: z.number().int().min(1).max(10).default(5),
  transactionType: transactionSchema.optional(),
});

const healthSchema = z.object({
  timeframe: timeframeSchema,
});

function formatMoney(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(amount);
}

function getTimeframe(name: TimeframeName): Timeframe {
  const today = startOfToday();

  if (name === "all") {
    return null;
  }

  if (name === "today") {
    return {
      label: "today",
      matches(date) {
        return isSameDay(date, today);
      },
    };
  }

  if (name === "this_week") {
    const start = startOfWeek(today, { weekStartsOn: 0 });
    const end = endOfWeek(today, { weekStartsOn: 0 });

    return {
      label: "this week",
      matches(date) {
        return !isBefore(date, start) && !isAfter(date, end);
      },
    };
  }

  if (name === "this_month") {
    const start = startOfMonth(today);
    const end = endOfMonth(today);

    return {
      label: "this month",
      matches(date) {
        return !isBefore(date, start) && !isAfter(date, end);
      },
    };
  }

  const nextMonth = startOfMonth(new Date(today.getFullYear(), today.getMonth() + 1, 1));
  const end = endOfMonth(nextMonth);

  return {
    label: "next month",
    matches(date) {
      return !isBefore(date, nextMonth) && !isAfter(date, end);
    },
  };
}

function filterEvents(
  allEvents: EventRecord[],
  timeframeName: TimeframeName,
  transactionType?: TransactionType,
) {
  const timeframe = getTimeframe(timeframeName);

  return allEvents.filter((event) => {
    if (transactionType && event.transactionType !== transactionType) {
      return false;
    }

    if (!timeframe) {
      return true;
    }

    return timeframe.matches(new Date(event.date));
  });
}

function getDayTotals(events: EventRecord[]) {
  const totals = new Map<string, number>();

  for (const event of events) {
    const key = format(new Date(event.date), "yyyy-MM-dd");
    totals.set(key, (totals.get(key) ?? 0) + event.amount);
  }

  return [...totals.entries()].sort((left, right) => left[0].localeCompare(right[0]));
}

export const EVENT_ANALYTICS_TOOLS = [
  {
    type: "function" as const,
    name: "get_transaction_summary",
    description:
      "Summarize money totals for events. Use this for questions about spent, earned, totals, net, or overviews.",
    strict: true,
    parameters: {
      type: "object",
      properties: {
        timeframe: {
          type: "string",
          enum: ["all", "today", "this_week", "this_month", "next_month"],
        },
        transactionType: {
          type: "string",
          enum: ["spent", "earned"],
        },
      },
      required: ["timeframe"],
      additionalProperties: false,
    },
  },
  {
    type: "function" as const,
    name: "count_transaction_days",
    description:
      "Count distinct days with earning or spending activity, optionally only days where the daily total exceeds a dollar threshold.",
    strict: true,
    parameters: {
      type: "object",
      properties: {
        timeframe: {
          type: "string",
          enum: ["all", "today", "this_week", "this_month", "next_month"],
        },
        transactionType: {
          type: "string",
          enum: ["spent", "earned"],
        },
        minAmount: {
          type: "number",
        },
      },
      required: ["timeframe"],
      additionalProperties: false,
    },
  },
  {
    type: "function" as const,
    name: "get_top_categories",
    description:
      "Return top categories by total dollars. Use this for category ranking questions.",
    strict: true,
    parameters: {
      type: "object",
      properties: {
        timeframe: {
          type: "string",
          enum: ["all", "today", "this_week", "this_month", "next_month"],
        },
        transactionType: {
          type: "string",
          enum: ["spent", "earned"],
        },
        limit: {
          type: "integer",
          minimum: 1,
          maximum: 10,
        },
      },
      required: ["timeframe", "limit"],
      additionalProperties: false,
    },
  },
  {
    type: "function" as const,
    name: "get_busiest_days",
    description:
      "Return the days with the most events. Use this for busiest day or most-events questions.",
    strict: true,
    parameters: {
      type: "object",
      properties: {
        timeframe: {
          type: "string",
          enum: ["all", "today", "this_week", "this_month", "next_month"],
        },
        limit: {
          type: "integer",
          minimum: 1,
          maximum: 10,
        },
      },
      required: ["timeframe", "limit"],
      additionalProperties: false,
    },
  },
  {
    type: "function" as const,
    name: "get_recent_events",
    description:
      "Return the most recent events. Use this for latest, recent, or show-me examples.",
    strict: true,
    parameters: {
      type: "object",
      properties: {
        timeframe: {
          type: "string",
          enum: ["all", "today", "this_week", "this_month", "next_month"],
        },
        transactionType: {
          type: "string",
          enum: ["spent", "earned"],
        },
        limit: {
          type: "integer",
          minimum: 1,
          maximum: 10,
        },
      },
      required: ["timeframe", "limit"],
      additionalProperties: false,
    },
  },
  {
    type: "function" as const,
    name: "get_health_breakdown",
    description:
      "Return counts of healthy and not healthy events for a timeframe.",
    strict: true,
    parameters: {
      type: "object",
      properties: {
        timeframe: {
          type: "string",
          enum: ["all", "today", "this_week", "this_month", "next_month"],
        },
      },
      required: ["timeframe"],
      additionalProperties: false,
    },
  },
];

export function runEventAnalyticsTool(
  name: string,
  rawArguments: string,
  allEvents: EventRecord[],
) {
  if (name === "get_transaction_summary") {
    const args = summarySchema.parse(JSON.parse(rawArguments));
    const events = filterEvents(allEvents, args.timeframe, args.transactionType);
    const totals = events.reduce(
      (summary, event) => {
        if (event.transactionType === "earned") {
          summary.earned += event.amount;
        } else {
          summary.spent += event.amount;
        }

        return summary;
      },
      { earned: 0, spent: 0 },
    );

    return JSON.stringify({
      timeframe: args.timeframe,
      transactionType: args.transactionType ?? null,
      eventCount: events.length,
      earned: totals.earned,
      spent: totals.spent,
      net: totals.earned - totals.spent,
      formatted: {
        earned: formatMoney(totals.earned),
        spent: formatMoney(totals.spent),
        net: formatMoney(totals.earned - totals.spent),
      },
    });
  }

  if (name === "count_transaction_days") {
    const args = countDaysSchema.parse(JSON.parse(rawArguments));
    const events = filterEvents(allEvents, args.timeframe, args.transactionType);
    const dayTotals = getDayTotals(events);
    const matchingDays =
      args.minAmount === undefined
        ? dayTotals
        : dayTotals.filter(([, amount]) => amount > args.minAmount!);

    return JSON.stringify({
      timeframe: args.timeframe,
      transactionType: args.transactionType ?? null,
      minAmount: args.minAmount ?? null,
      dayCount: matchingDays.length,
      days: matchingDays.map(([date, amount]) => ({
        date,
        displayDate: format(new Date(date), "MMM d, yyyy"),
        amount,
        formattedAmount: formatMoney(amount),
      })),
    });
  }

  if (name === "get_top_categories") {
    const args = categoriesSchema.parse(JSON.parse(rawArguments));
    const events = filterEvents(allEvents, args.timeframe, args.transactionType);
    const totals = new Map<string, number>();

    for (const event of events) {
      totals.set(event.category, (totals.get(event.category) ?? 0) + event.amount);
    }

    const categories = [...totals.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, args.limit)
      .map(([category, amount]) => ({
        category,
        amount,
        formattedAmount: formatMoney(amount),
      }));

    return JSON.stringify({
      timeframe: args.timeframe,
      transactionType: args.transactionType ?? null,
      categories,
    });
  }

  if (name === "get_busiest_days") {
    const args = busiestDaysSchema.parse(JSON.parse(rawArguments));
    const events = filterEvents(allEvents, args.timeframe);
    const counts = new Map<string, number>();

    for (const event of events) {
      const key = format(new Date(event.date), "yyyy-MM-dd");
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    const days = [...counts.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, args.limit)
      .map(([date, count]) => ({
        date,
        displayDate: format(new Date(date), "MMM d, yyyy"),
        count,
      }));

    return JSON.stringify({
      timeframe: args.timeframe,
      days,
    });
  }

  if (name === "get_recent_events") {
    const args = recentEventsSchema.parse(JSON.parse(rawArguments));
    const events = filterEvents(allEvents, args.timeframe, args.transactionType)
      .sort((left, right) => right.date.localeCompare(left.date))
      .slice(0, args.limit)
      .map((event) => ({
        id: event._id,
        title: event.title,
        description: event.description,
        date: event.date,
        displayDate: format(new Date(event.date), "MMM d, yyyy"),
        amount: event.amount,
        formattedAmount: formatMoney(event.amount),
        transactionType: event.transactionType,
        category: event.category,
        isHealthy: event.isHealthy,
      }));

    return JSON.stringify({
      timeframe: args.timeframe,
      transactionType: args.transactionType ?? null,
      events,
    });
  }

  if (name === "get_health_breakdown") {
    const args = healthSchema.parse(JSON.parse(rawArguments));
    const events = filterEvents(allEvents, args.timeframe);
    const breakdown = events.reduce(
      (summary, event) => {
        if (event.isHealthy) {
          summary.healthy += 1;
        } else {
          summary.notHealthy += 1;
        }

        return summary;
      },
      { healthy: 0, notHealthy: 0 },
    );

    return JSON.stringify({
      timeframe: args.timeframe,
      ...breakdown,
    });
  }

  throw new Error(`Unsupported tool: ${name}`);
}
