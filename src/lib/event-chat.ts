import {
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  isSameDay,
  startOfMonth,
  startOfToday,
  startOfWeek,
} from "date-fns";

import { type EventRecord } from "@/types/event";

type Timeframe =
  | {
      label: string;
      matches(date: Date): boolean;
    }
  | null;

type EventChatResponse = {
  answer: string;
  suggestions: string[];
};

function formatMoney(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(amount);
}

function parseTimeframe(question: string): Timeframe {
  const normalized = question.toLowerCase();
  const today = startOfToday();

  if (normalized.includes("today")) {
    return {
      label: "today",
      matches(date) {
        return isSameDay(date, today);
      },
    };
  }

  if (normalized.includes("this week")) {
    const start = startOfWeek(today, { weekStartsOn: 0 });
    const end = endOfWeek(today, { weekStartsOn: 0 });

    return {
      label: "this week",
      matches(date) {
        return !isBefore(date, start) && !isAfter(date, end);
      },
    };
  }

  if (normalized.includes("this month") || normalized.includes("current month")) {
    const start = startOfMonth(today);
    const end = endOfMonth(today);

    return {
      label: "this month",
      matches(date) {
        return !isBefore(date, start) && !isAfter(date, end);
      },
    };
  }

  if (normalized.includes("next month")) {
    const nextMonth = startOfMonth(new Date(today.getFullYear(), today.getMonth() + 1, 1));
    const end = endOfMonth(nextMonth);

    return {
      label: "next month",
      matches(date) {
        return !isBefore(date, nextMonth) && !isAfter(date, end);
      },
    };
  }

  return null;
}

function filterByTimeframe(events: EventRecord[], timeframe: Timeframe) {
  if (!timeframe) {
    return events;
  }

  return events.filter((event) => timeframe.matches(new Date(event.date)));
}

function summarizeMoney(events: EventRecord[]) {
  return events.reduce(
    (summary, event) => {
      if (event.transactionType === "earned") {
        summary.earned += event.amount;
      } else {
        summary.spent += event.amount;
      }

      if (event.isHealthy) {
        summary.healthy += 1;
      } else {
        summary.notHealthy += 1;
      }

      return summary;
    },
    { earned: 0, spent: 0, healthy: 0, notHealthy: 0 },
  );
}

function getTopCategories(events: EventRecord[], transactionType?: "earned" | "spent") {
  const totals = new Map<string, number>();

  for (const event of events) {
    if (transactionType && event.transactionType !== transactionType) {
      continue;
    }

    totals.set(event.category, (totals.get(event.category) ?? 0) + event.amount);
  }

  return [...totals.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 3);
}

function getBusiestDays(events: EventRecord[]) {
  const counts = new Map<string, number>();

  for (const event of events) {
    const key = format(new Date(event.date), "yyyy-MM-dd");
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 3);
}

function getRecentEvents(events: EventRecord[]) {
  return [...events]
    .sort((left, right) => right.date.localeCompare(left.date))
    .slice(0, 5);
}

function buildFallbackSummary(events: EventRecord[], timeframe: Timeframe) {
  const summary = summarizeMoney(events);
  const label = timeframe ? ` for ${timeframe.label}` : "";
  const topSpent = getTopCategories(events, "spent")[0];
  const topEarned = getTopCategories(events, "earned")[0];

  return [
    `I found ${events.length} event${events.length === 1 ? "" : "s"}${label}.`,
    `Earned ${formatMoney(summary.earned)}, spent ${formatMoney(summary.spent)}, net ${formatMoney(summary.earned - summary.spent)}.`,
    `Healthy vs not healthy: ${summary.healthy} / ${summary.notHealthy}.`,
    topSpent
      ? `Top spending category: ${topSpent[0]} at ${formatMoney(topSpent[1])}.`
      : "No spending categories yet.",
    topEarned
      ? `Top earning category: ${topEarned[0]} at ${formatMoney(topEarned[1])}.`
      : "No earning categories yet.",
  ].join("\n");
}

export function answerEventQuestion(
  question: string,
  allEvents: EventRecord[],
): EventChatResponse {
  const trimmedQuestion = question.trim();

  if (!trimmedQuestion) {
    return {
      answer:
        "Ask about totals, categories, healthy habits, or busy dates. I can summarize what is already in your calendar data.",
      suggestions: [
        "How much did I spend this month?",
        "What are my top categories?",
        "How many healthy events do I have?",
      ],
    };
  }

  const timeframe = parseTimeframe(trimmedQuestion);
  const events = filterByTimeframe(allEvents, timeframe);
  const normalized = trimmedQuestion.toLowerCase();

  if (events.length === 0) {
    return {
      answer: timeframe
        ? `I could not find any events for ${timeframe.label}.`
        : "I could not find any events in the database yet.",
      suggestions: [
        "Show me all events",
        "What should I add next?",
        "How much did I spend this month?",
      ],
    };
  }

  if (
    normalized.includes("how much") ||
    normalized.includes("total") ||
    normalized.includes("summary") ||
    normalized.includes("net")
  ) {
    const summary = summarizeMoney(events);
    const label = timeframe ? ` for ${timeframe.label}` : "";

    return {
      answer: [
        `Here is the money summary${label}.`,
        `Earned: ${formatMoney(summary.earned)}`,
        `Spent: ${formatMoney(summary.spent)}`,
        `Net: ${formatMoney(summary.earned - summary.spent)}`,
      ].join("\n"),
      suggestions: [
        "What are my top categories?",
        "Which days are busiest?",
        "How many healthy events do I have?",
      ],
    };
  }

  if (normalized.includes("healthy")) {
    const summary = summarizeMoney(events);
    const label = timeframe ? ` for ${timeframe.label}` : "";

    return {
      answer: [
        `Health snapshot${label}:`,
        `Healthy events: ${summary.healthy}`,
        `Not healthy events: ${summary.notHealthy}`,
      ].join("\n"),
      suggestions: [
        "How much did I spend this month?",
        "What are my top categories?",
        "Show me recent events",
      ],
    };
  }

  if (normalized.includes("category") || normalized.includes("categories")) {
    const transactionType = normalized.includes("earn")
      ? "earned"
      : normalized.includes("spen")
        ? "spent"
        : undefined;
    const categories = getTopCategories(events, transactionType);
    const label = timeframe ? ` for ${timeframe.label}` : "";

    return {
      answer:
        categories.length === 0
          ? `I could not find category totals${label}.`
          : [
              `Top categories${label}:`,
              ...categories.map(
                ([category, amount], index) =>
                  `${index + 1}. ${category}: ${formatMoney(amount)}`,
              ),
            ].join("\n"),
      suggestions: [
        "How much did I spend this month?",
        "Which days are busiest?",
        "Show me recent events",
      ],
    };
  }

  if (
    normalized.includes("busiest") ||
    normalized.includes("busy") ||
    normalized.includes("most events")
  ) {
    const days = getBusiestDays(events);
    const label = timeframe ? ` for ${timeframe.label}` : "";

    return {
      answer: [
        `Busiest days${label}:`,
        ...days.map(
          ([date, count], index) =>
            `${index + 1}. ${format(new Date(date), "MMM d, yyyy")}: ${count} event${
              count === 1 ? "" : "s"
            }`,
        ),
      ].join("\n"),
      suggestions: [
        "Show me recent events",
        "How many healthy events do I have?",
        "What are my top categories?",
      ],
    };
  }

  if (
    normalized.includes("recent") ||
    normalized.includes("latest") ||
    normalized.includes("show me")
  ) {
    const recentEvents = getRecentEvents(events);

    return {
      answer: [
        "Here are the most recent events I found:",
        ...recentEvents.map(
          (event) =>
            `${format(new Date(event.date), "MMM d")}: ${event.title} (${event.category}, ${event.transactionType} ${formatMoney(event.amount)})`,
        ),
      ].join("\n"),
      suggestions: [
        "How much did I spend this month?",
        "Which days are busiest?",
        "How many healthy events do I have?",
      ],
    };
  }

  return {
    answer: buildFallbackSummary(events, timeframe),
    suggestions: [
      "How much did I spend this month?",
      "What are my top categories?",
      "Which days are busiest?",
    ],
  };
}
