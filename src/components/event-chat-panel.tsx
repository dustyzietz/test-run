"use client";

import { startTransition, useState } from "react";

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
};

type EventChatPanelProps = {
  dbConfigured: boolean;
};

const STARTERS = [
  "How much did I spend this month?",
  "What are my top categories?",
  "How many healthy events do I have?",
  "Which days are busiest?",
];

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong while asking about your data.";
}

export function EventChatPanel({ dbConfigured }: EventChatPanelProps) {
  const [question, setQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Ask about spending, earnings, healthy habits, categories, or your busiest days. I will answer from the events already stored in MongoDB.",
    },
  ]);

  const submitQuestion = async (value: string) => {
    const trimmedValue = value.trim();

    if (!trimmedValue || !dbConfigured || isLoading) {
      return;
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: trimmedValue,
    };

    startTransition(() => {
      setMessages((current) => [...current, userMessage]);
      setQuestion("");
    });

    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ question: trimmedValue }),
      });

      const data = (await response.json()) as {
        answer?: string;
        message?: string;
      };
      const answer = data.answer;

      if (!response.ok || !answer) {
        throw new Error(data.message ?? "Unable to answer question.");
      }

      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: answer,
        },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: `assistant-error-${Date.now()}`,
          role: "assistant",
          content: getErrorMessage(error),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="card overflow-hidden rounded-[2rem] border border-white/60 bg-white/85 shadow-lg shadow-slate-900/5 backdrop-blur">
      <div className="card-body gap-5 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-700">
              Ask Your Calendar
            </p>
            <h2 className="mt-2 text-3xl font-bold text-slate-900">
              Chat with your event data from the homepage.
            </h2>
            <p className="mt-3 text-base leading-7 text-slate-600">
              This chat answers from your saved MongoDB events, so it is great
              for quick summaries and pattern checks.
            </p>
          </div>
          <div className="rounded-3xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-950">
            {dbConfigured
              ? "Live data mode is on."
              : "Connect MongoDB to enable data chat."}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.82fr_1.18fr]">
          <div className="space-y-4 rounded-[1.75rem] border border-slate-200 bg-[linear-gradient(160deg,rgba(236,254,255,0.95),rgba(255,255,255,0.9))] p-5">
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Starter questions
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Try one of these to get a feel for the data-aware answers.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {STARTERS.map((starter) => (
                <button
                  key={starter}
                  type="button"
                  className="rounded-full border border-cyan-200 bg-white px-4 py-2 text-left text-sm font-medium text-slate-700 transition hover:border-cyan-400 hover:bg-cyan-50"
                  onClick={() => submitQuestion(starter)}
                  disabled={!dbConfigured || isLoading}
                >
                  {starter}
                </button>
              ))}
            </div>

            <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-white/80 p-4 text-sm leading-6 text-slate-600">
              It currently handles summaries for money totals, categories,
              healthy vs not healthy counts, recent events, and busy dates.
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-slate-200 bg-slate-950 p-4 text-white shadow-inner">
            <div className="flex h-full min-h-[24rem] flex-col gap-4">
              <div className="flex-1 space-y-3 overflow-y-auto rounded-[1.5rem] bg-white/5 p-3">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`max-w-[92%] rounded-[1.4rem] px-4 py-3 text-sm leading-6 whitespace-pre-wrap ${
                      message.role === "user"
                        ? "ml-auto bg-cyan-400 text-slate-950"
                        : "bg-white/10 text-slate-100"
                    }`}
                  >
                    {message.content}
                  </div>
                ))}

                {isLoading ? (
                  <div className="max-w-[92%] rounded-[1.4rem] bg-white/10 px-4 py-3 text-sm text-slate-300">
                    Checking your data...
                  </div>
                ) : null}
              </div>

              <form
                className="flex flex-col gap-3 rounded-[1.5rem] border border-white/10 bg-white/5 p-3"
                onSubmit={async (event) => {
                  event.preventDefault();
                  await submitQuestion(question);
                }}
              >
                <label className="text-sm font-medium text-slate-200">
                  Ask a question about your events
                </label>
                <textarea
                  className="min-h-28 rounded-[1.2rem] border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300"
                  placeholder="Example: What did I spend this month, and what category cost the most?"
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  disabled={!dbConfigured || isLoading}
                />
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-slate-400">
                    {dbConfigured
                      ? "Answers are generated from the events stored in MongoDB."
                      : "MongoDB is not configured yet."}
                  </p>
                  <button
                    type="submit"
                    className="btn rounded-full border-none bg-cyan-400 px-6 text-slate-950 hover:bg-cyan-300 disabled:bg-slate-700 disabled:text-slate-300"
                    disabled={!dbConfigured || isLoading || !question.trim()}
                  >
                    {isLoading ? "Thinking..." : "Ask"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
