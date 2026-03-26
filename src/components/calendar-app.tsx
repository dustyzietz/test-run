"use client";

import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { type FormEvent, useMemo, useState } from "react";

import { EventChatPanel } from "@/components/event-chat-panel";
import { DEFAULT_CATEGORIES } from "@/lib/constants";
import { type EventFormValues, type EventRecord } from "@/types/event";

const initialFormValues: EventFormValues = {
  title: "",
  description: "",
  date: format(new Date(), "yyyy-MM-dd"),
  amount: 0,
  transactionType: "spent",
  category: DEFAULT_CATEGORIES[0],
  isHealthy: true,
};

type CalendarAppProps = {
  initialEvents: EventRecord[];
  dbConfigured: boolean;
};

type Filters = {
  category: string;
  health: "all" | "healthy" | "not-healthy";
  transactionType: "all" | "spent" | "earned";
};

function formatMoney(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function getFormValues(event?: EventRecord): EventFormValues {
  if (!event) {
    return initialFormValues;
  }

  return {
    title: event.title,
    description: event.description,
    date: format(parseISO(event.date), "yyyy-MM-dd"),
    amount: event.amount,
    transactionType: event.transactionType,
    category: event.category,
    isHealthy: event.isHealthy,
  };
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}

export function CalendarApp({
  initialEvents,
  dbConfigured,
}: CalendarAppProps) {
  const [events, setEvents] = useState(initialEvents);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [visibleMonth, setVisibleMonth] = useState(startOfMonth(new Date()));
  const [filters, setFilters] = useState<Filters>({
    category: "all",
    health: "all",
    transactionType: "all",
  });
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [formValues, setFormValues] = useState(initialFormValues);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);

  const allCategories = useMemo(() => {
    return Array.from(
      new Set(
        [...DEFAULT_CATEGORIES, ...events.map((event) => event.category)]
          .map((category) => category.trim())
          .filter(Boolean),
      ),
    ).sort((left, right) => left.localeCompare(right));
  }, [events]);

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      if (filters.category !== "all" && event.category !== filters.category) {
        return false;
      }

      if (
        filters.transactionType !== "all" &&
        event.transactionType !== filters.transactionType
      ) {
        return false;
      }

      if (filters.health === "healthy" && !event.isHealthy) {
        return false;
      }

      if (filters.health === "not-healthy" && event.isHealthy) {
        return false;
      }

      return true;
    });
  }, [events, filters]);

  const selectedDateEvents = useMemo(() => {
    return filteredEvents.filter((event) =>
      isSameDay(parseISO(event.date), selectedDate),
    );
  }, [filteredEvents, selectedDate]);

  const visibleMonthEvents = useMemo(() => {
    return filteredEvents.filter((event) =>
      isSameMonth(parseISO(event.date), visibleMonth),
    );
  }, [filteredEvents, visibleMonth]);

  const summary = useMemo(() => {
    return filteredEvents.reduce(
      (totals, event) => {
        if (event.transactionType === "earned") {
          totals.earned += event.amount;
        } else {
          totals.spent += event.amount;
        }

        return totals;
      },
      { spent: 0, earned: 0 },
    );
  }, [filteredEvents]);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(visibleMonth), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(visibleMonth), { weekStartsOn: 0 });

    return eachDayOfInterval({ start, end });
  }, [visibleMonth]);

  const resetForm = (date = selectedDate) => {
    setEditingEventId(null);
    setFormValues({
      ...initialFormValues,
      date: format(date, "yyyy-MM-dd"),
    });
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setVisibleMonth(startOfMonth(date));

    if (!editingEventId) {
      setFormValues((current) => ({
        ...current,
        date: format(date, "yyyy-MM-dd"),
      }));
    }
  };

  const handleEdit = (event: EventRecord) => {
    const eventDate = parseISO(event.date);

    setEditingEventId(event._id);
    setSelectedDate(eventDate);
    setVisibleMonth(startOfMonth(eventDate));
    setFormValues(getFormValues(event));
    setFeedback(null);
  };

  const handleSubmit = async (formData: FormData) => {
    setIsSaving(true);
    setFeedback(null);

    const payload = {
      title: String(formData.get("title") ?? ""),
      description: String(formData.get("description") ?? ""),
      date: String(formData.get("date") ?? ""),
      amount: Number(formData.get("amount") ?? 0),
      transactionType: String(formData.get("transactionType") ?? "spent"),
      category: String(formData.get("category") ?? ""),
      isHealthy: formData.get("isHealthy") === "on",
    };

    try {
      const response = await fetch(
        editingEventId ? `/api/events/${editingEventId}` : "/api/events",
        {
          method: editingEventId ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      const data = (await response.json()) as {
        event?: EventRecord;
        message?: string;
      };

      if (!response.ok || !data.event) {
        throw new Error(data.message ?? "Unable to save event.");
      }

      setEvents((current) => {
        if (!editingEventId) {
          return [...current, data.event!].sort((left, right) =>
            left.date.localeCompare(right.date),
          );
        }

        return current
          .map((event) => (event._id === data.event!._id ? data.event! : event))
          .sort((left, right) => left.date.localeCompare(right.date));
      });

      const savedDate = parseISO(data.event.date);
      setSelectedDate(savedDate);
      setVisibleMonth(startOfMonth(savedDate));
      resetForm(savedDate);
      setFeedback({
        tone: "success",
        message: editingEventId
          ? "Event updated successfully."
          : "Event created successfully.",
      });
    } catch (error) {
      setFeedback({
        tone: "error",
        message: getErrorMessage(error),
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleFormSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    await handleSubmit(new FormData(event.currentTarget));
  };

  const handleDelete = async (eventId: string) => {
    setIsSaving(true);
    setFeedback(null);

    try {
      const response = await fetch(`/api/events/${eventId}`, {
        method: "DELETE",
      });

      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(data.message ?? "Unable to delete event.");
      }

      setEvents((current) => current.filter((event) => event._id !== eventId));

      if (editingEventId === eventId) {
        resetForm();
      }

      setFeedback({
        tone: "success",
        message: "Event deleted.",
      });
    } catch (error) {
      setFeedback({
        tone: "error",
        message: getErrorMessage(error),
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.92),_rgba(253,246,227,0.75)_38%,_rgba(231,240,255,0.92)_100%)] text-slate-900">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 lg:px-8">
        <section className="hero overflow-hidden rounded-[2rem] border border-white/60 bg-white/75 shadow-xl shadow-slate-900/5 backdrop-blur">
          <div className="hero-content w-full flex-col items-start gap-6 px-6 py-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-700">
                Personal Money + Wellness Calendar
              </p>
              <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
                Plan your days, track your money, and spot healthy patterns.
              </h1>
              <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">
                Add one-time events, mark what you spent or earned, keep
                categories tidy, and tag every event as healthy or not.
              </p>
            </div>
            <div className="stats stats-vertical w-full gap-4 bg-transparent shadow-none sm:stats-horizontal lg:w-auto">
              <div className="stat rounded-3xl border border-emerald-200 bg-emerald-50/80">
                <div className="stat-title text-emerald-900">Earned</div>
                <div className="stat-value text-3xl text-emerald-700">
                  {formatMoney(summary.earned)}
                </div>
              </div>
              <div className="stat rounded-3xl border border-rose-200 bg-rose-50/80">
                <div className="stat-title text-rose-900">Spent</div>
                <div className="stat-value text-3xl text-rose-700">
                  {formatMoney(summary.spent)}
                </div>
              </div>
              <div className="stat rounded-3xl border border-sky-200 bg-sky-50/80">
                <div className="stat-title text-sky-900">Net</div>
                <div className="stat-value text-3xl text-sky-700">
                  {formatMoney(summary.earned - summary.spent)}
                </div>
              </div>
            </div>
          </div>
        </section>

        {!dbConfigured ? (
          <div className="alert alert-warning rounded-3xl border border-amber-200 bg-amber-50 text-amber-950 shadow-sm">
            <span>
              Add `MONGODB_URI` to your environment before creating events. The
              UI is ready, but data storage is disabled until MongoDB is
              configured.
            </span>
          </div>
        ) : null}

        {feedback ? (
          <div
            className={`alert rounded-3xl shadow-sm ${
              feedback.tone === "success" ? "alert-success" : "alert-error"
            }`}
          >
            <span>{feedback.message}</span>
          </div>
        ) : null}

        <EventChatPanel dbConfigured={dbConfigured} />

        <section className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
          <div className="space-y-6">
            <div className="card rounded-[2rem] border border-white/60 bg-white/80 shadow-lg shadow-slate-900/5 backdrop-blur">
              <div className="card-body gap-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
                      Calendar
                    </p>
                    <h2 className="mt-2 text-3xl font-bold text-slate-900">
                      {format(visibleMonth, "MMMM yyyy")}
                    </h2>
                  </div>
                  <div className="join">
                    <button
                      type="button"
                      className="btn join-item border-none bg-slate-900 text-white hover:bg-slate-700"
                      onClick={() =>
                        setVisibleMonth((current) => subMonths(current, 1))
                      }
                    >
                      Prev
                    </button>
                    <button
                      type="button"
                      className="btn join-item border-none bg-white text-slate-700 hover:bg-slate-100"
                      onClick={() => {
                        const today = new Date();

                        setVisibleMonth(startOfMonth(today));
                        handleDateSelect(today);
                      }}
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      className="btn join-item border-none bg-slate-900 text-white hover:bg-slate-700"
                      onClick={() =>
                        setVisibleMonth((current) => addMonths(current, 1))
                      }
                    >
                      Next
                    </button>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <label className="form-control">
                    <span className="label-text mb-2 font-medium text-slate-700">
                      Category
                    </span>
                    <select
                      className="select select-bordered rounded-2xl border-slate-200 bg-white"
                      value={filters.category}
                      onChange={(event) =>
                        setFilters((current) => ({
                          ...current,
                          category: event.target.value,
                        }))
                      }
                    >
                      <option value="all">All categories</option>
                      {allCategories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="form-control">
                    <span className="label-text mb-2 font-medium text-slate-700">
                      Healthy
                    </span>
                    <select
                      className="select select-bordered rounded-2xl border-slate-200 bg-white"
                      value={filters.health}
                      onChange={(event) =>
                        setFilters((current) => ({
                          ...current,
                          health: event.target.value as Filters["health"],
                        }))
                      }
                    >
                      <option value="all">All events</option>
                      <option value="healthy">Healthy only</option>
                      <option value="not-healthy">Not healthy only</option>
                    </select>
                  </label>

                  <label className="form-control">
                    <span className="label-text mb-2 font-medium text-slate-700">
                      Money type
                    </span>
                    <select
                      className="select select-bordered rounded-2xl border-slate-200 bg-white"
                      value={filters.transactionType}
                      onChange={(event) =>
                        setFilters((current) => ({
                          ...current,
                          transactionType:
                            event.target.value as Filters["transactionType"],
                        }))
                      }
                    >
                      <option value="all">Spent + earned</option>
                      <option value="spent">Spent only</option>
                      <option value="earned">Earned only</option>
                    </select>
                  </label>
                </div>

                <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold uppercase tracking-[0.25em] text-slate-500">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                    (day) => (
                      <div key={day} className="py-2">
                        {day}
                      </div>
                    ),
                  )}
                </div>

                <div className="grid grid-cols-7 gap-2">
                  {days.map((day) => {
                    const dayEvents = visibleMonthEvents.filter((event) =>
                      isSameDay(parseISO(event.date), day),
                    );

                    return (
                      <button
                        key={day.toISOString()}
                        type="button"
                        onClick={() => handleDateSelect(day)}
                        className={`min-h-28 rounded-3xl border p-3 text-left transition ${
                          isSameDay(day, selectedDate)
                            ? "border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-900/10"
                            : "border-slate-200 bg-white/90 hover:border-slate-400 hover:bg-slate-50"
                        } ${!isSameMonth(day, visibleMonth) ? "opacity-40" : ""}`}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-sm font-semibold ${
                              isToday(day)
                                ? "underline decoration-2 underline-offset-4"
                                : ""
                            }`}
                          >
                            {format(day, "d")}
                          </span>
                          {dayEvents.length ? (
                            <span className="badge badge-sm border-none bg-amber-200 text-amber-950">
                              {dayEvents.length}
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-3 space-y-2">
                          {dayEvents.slice(0, 2).map((event) => (
                            <div
                              key={event._id}
                              className={`rounded-2xl px-2 py-1 text-xs font-medium ${
                                event.transactionType === "earned"
                                  ? "bg-emerald-100 text-emerald-900"
                                  : "bg-rose-100 text-rose-900"
                              }`}
                            >
                              <div className="truncate">{event.title}</div>
                              <div className="truncate opacity-75">
                                {formatMoney(event.amount)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="card rounded-[2rem] border border-white/60 bg-white/80 shadow-lg shadow-slate-900/5 backdrop-blur">
              <div className="card-body">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
                      Selected Day
                    </p>
                    <h3 className="mt-2 text-2xl font-bold text-slate-900">
                      {format(selectedDate, "EEEE, MMMM d")}
                    </h3>
                  </div>
                  <button
                    type="button"
                    className="btn rounded-2xl border-none bg-slate-900 text-white hover:bg-slate-700"
                    onClick={() => resetForm(selectedDate)}
                  >
                    Add event for this day
                  </button>
                </div>

                <div className="mt-4 space-y-4">
                  {selectedDateEvents.length ? (
                    selectedDateEvents.map((event) => (
                      <div
                        key={event._id}
                        className="rounded-[1.75rem] border border-slate-200 bg-slate-50/90 p-4"
                      >
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="space-y-3">
                            <div className="flex flex-wrap gap-2">
                              <span
                                className={`badge rounded-full border-none px-3 py-3 ${
                                  event.transactionType === "earned"
                                    ? "badge-success"
                                    : "badge-error"
                                }`}
                              >
                                {event.transactionType === "earned"
                                  ? "Earned"
                                  : "Spent"}{" "}
                                {formatMoney(event.amount)}
                              </span>
                              <span className="badge rounded-full border-none bg-slate-200 px-3 py-3 text-slate-700">
                                {event.category}
                              </span>
                              <span
                                className={`badge rounded-full border-none px-3 py-3 ${
                                  event.isHealthy
                                    ? "bg-emerald-100 text-emerald-900"
                                    : "bg-slate-300 text-slate-800"
                                }`}
                              >
                                {event.isHealthy ? "Healthy" : "Not healthy"}
                              </span>
                            </div>
                            <div>
                              <h4 className="text-xl font-bold text-slate-900">
                                {event.title}
                              </h4>
                              {event.description ? (
                                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                                  {event.description}
                                </p>
                              ) : null}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              className="btn rounded-2xl border-none bg-white text-slate-800 hover:bg-slate-200"
                              onClick={() => handleEdit(event)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="btn rounded-2xl border-none bg-rose-600 text-white hover:bg-rose-700"
                              onClick={() => handleDelete(event._id)}
                              disabled={isSaving || !dbConfigured}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[1.75rem] border border-dashed border-slate-300 bg-slate-50/80 p-8 text-center text-slate-500">
                      No events match the current filters on this day yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="card rounded-[2rem] border border-white/60 bg-white/85 shadow-lg shadow-slate-900/5 backdrop-blur">
              <div className="card-body">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
                      {editingEventId ? "Edit Event" : "New Event"}
                    </p>
                    <h2 className="mt-2 text-3xl font-bold text-slate-900">
                      {editingEventId
                        ? "Update the details"
                        : "Create a one-time event"}
                    </h2>
                  </div>
                  {editingEventId ? (
                    <button
                      type="button"
                      className="btn btn-ghost rounded-2xl"
                      onClick={() => resetForm(selectedDate)}
                    >
                      Cancel
                    </button>
                  ) : null}
                </div>

                <form className="mt-6 space-y-4" onSubmit={handleFormSubmit}>
                  <label className="form-control">
                    <span className="label-text mb-2 font-medium text-slate-700">
                      Title
                    </span>
                    <input
                      name="title"
                      className="input input-bordered rounded-2xl border-slate-200 bg-white"
                      placeholder="Team lunch, freelance invoice, gym class..."
                      value={formValues.title}
                      onChange={(event) =>
                        setFormValues((current) => ({
                          ...current,
                          title: event.target.value,
                        }))
                      }
                      required
                    />
                  </label>

                  <label className="form-control">
                    <span className="label-text mb-2 font-medium text-slate-700">
                      Description
                    </span>
                    <textarea
                      name="description"
                      className="textarea textarea-bordered min-h-28 rounded-2xl border-slate-200 bg-white"
                      placeholder="Optional notes"
                      value={formValues.description}
                      onChange={(event) =>
                        setFormValues((current) => ({
                          ...current,
                          description: event.target.value,
                        }))
                      }
                    />
                  </label>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="form-control">
                      <span className="label-text mb-2 font-medium text-slate-700">
                        Date
                      </span>
                      <input
                        name="date"
                        type="date"
                        className="input input-bordered rounded-2xl border-slate-200 bg-white"
                        value={formValues.date}
                        onChange={(event) =>
                          setFormValues((current) => ({
                            ...current,
                            date: event.target.value,
                          }))
                        }
                        required
                      />
                    </label>

                    <label className="form-control">
                      <span className="label-text mb-2 font-medium text-slate-700">
                        Amount
                      </span>
                      <input
                        name="amount"
                        type="number"
                        min="0"
                        step="0.01"
                        className="input input-bordered rounded-2xl border-slate-200 bg-white"
                        value={formValues.amount}
                        onChange={(event) =>
                          setFormValues((current) => ({
                            ...current,
                            amount: Number(event.target.value),
                          }))
                        }
                        required
                      />
                    </label>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="form-control">
                      <span className="label-text mb-2 font-medium text-slate-700">
                        Spent or earned
                      </span>
                      <select
                        name="transactionType"
                        className="select select-bordered rounded-2xl border-slate-200 bg-white"
                        value={formValues.transactionType}
                        onChange={(event) =>
                          setFormValues((current) => ({
                            ...current,
                            transactionType:
                              event.target.value as EventFormValues["transactionType"],
                          }))
                        }
                      >
                        <option value="spent">Spent</option>
                        <option value="earned">Earned</option>
                      </select>
                    </label>

                    <label className="form-control">
                      <span className="label-text mb-2 font-medium text-slate-700">
                        Category
                      </span>
                      <input
                        name="category"
                        list="event-categories"
                        className="input input-bordered rounded-2xl border-slate-200 bg-white"
                        placeholder="Choose or type a category"
                        value={formValues.category}
                        onChange={(event) =>
                          setFormValues((current) => ({
                            ...current,
                            category: event.target.value,
                          }))
                        }
                        required
                      />
                    </label>
                  </div>

                  <datalist id="event-categories">
                    {allCategories.map((category) => (
                      <option key={category} value={category} />
                    ))}
                  </datalist>

                  <label className="label cursor-pointer justify-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                    <input
                      name="isHealthy"
                      type="checkbox"
                      className="toggle toggle-success"
                      checked={formValues.isHealthy}
                      onChange={(event) =>
                        setFormValues((current) => ({
                          ...current,
                          isHealthy: event.target.checked,
                        }))
                      }
                    />
                    <span className="label-text text-base text-slate-700">
                      Mark this event as healthy
                    </span>
                  </label>

                  <button
                    type="submit"
                    className="btn w-full rounded-2xl border-none bg-slate-900 text-white hover:bg-slate-700"
                    disabled={isSaving || !dbConfigured}
                  >
                    {isSaving
                      ? "Saving..."
                      : editingEventId
                        ? "Update event"
                        : "Create event"}
                  </button>
                </form>
              </div>
            </div>

            <div className="card rounded-[2rem] border border-white/60 bg-white/85 shadow-lg shadow-slate-900/5 backdrop-blur">
              <div className="card-body">
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
                  Monthly Snapshot
                </p>
                <h3 className="mt-2 text-2xl font-bold text-slate-900">
                  {format(visibleMonth, "MMMM")} at a glance
                </h3>
                <div className="mt-5 space-y-3">
                  <div className="flex items-center justify-between rounded-2xl bg-emerald-50 px-4 py-3 text-emerald-900">
                    <span>Earned this month</span>
                    <span className="font-bold">
                      {formatMoney(
                        visibleMonthEvents
                          .filter((event) => event.transactionType === "earned")
                          .reduce((total, event) => total + event.amount, 0),
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-rose-50 px-4 py-3 text-rose-900">
                    <span>Spent this month</span>
                    <span className="font-bold">
                      {formatMoney(
                        visibleMonthEvents
                          .filter((event) => event.transactionType === "spent")
                          .reduce((total, event) => total + event.amount, 0),
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-slate-100 px-4 py-3 text-slate-800">
                    <span>Healthy events</span>
                    <span className="font-bold">
                      {
                        visibleMonthEvents.filter((event) => event.isHealthy)
                          .length
                      }
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-slate-100 px-4 py-3 text-slate-800">
                    <span>Total events</span>
                    <span className="font-bold">{visibleMonthEvents.length}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
