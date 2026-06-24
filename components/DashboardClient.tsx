"use client";

import { useState } from "react";
import useSWR from "swr";
import type { DashboardResponse } from "../app/api/_data/dashboardStore";

const fetcher = async (url: string): Promise<DashboardResponse> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("fetch failed");
  return res.json() as Promise<DashboardResponse>;
};

function formatLocalDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Intl.DateTimeFormat(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(y, m - 1, d));
}

export default function DashboardClient() {
  const { data, error, isLoading, mutate } = useSWR<DashboardResponse>(
    "/api/dashboard",
    fetcher
  );
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (isLoading) {
    return <p className="text-zinc-500">Loading dashboard…</p>;
  }

  if (error || !data) {
    return <p className="text-red-600">Could not load dashboard.</p>;
  }

  const buttonLabel = isSubmitting
    ? "Logging…"
    : data.checked_in_today
    ? "Already checked in today"
    : "Log today's check-in";

  const isDisabled = isSubmitting || data.checked_in_today || notes.length > 500;

  async function handleSubmit() {
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });

      if (!res.ok) {
        setSubmitError(
          res.status === 409
            ? "You have already checked in today."
            : "Could not log check-in. Please try again."
        );
        mutate();
        return;
      }

      const updated = (await res.json()) as DashboardResponse;
      // Not awaited so the cache update, note clear, and isSubmitting=false
      // from the finally block all land in the same React render batch.
      mutate(updated, false);
      mutate();
      setNotes("");
    } catch {
      setSubmitError("Could not log check-in. Please try again.");
      mutate();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-4xl font-bold text-zinc-900 dark:text-zinc-50">
          {data.streak}-day streak
        </p>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          {data.weekly_complete ? "Weekly check-in done" : "Weekly check-in needed"}
        </p>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-zinc-400">
          Recent check-ins
        </h2>
        {data.recent_check_ins.length === 0 ? (
          <p className="text-sm text-zinc-500">No recent check-ins yet.</p>
        ) : (
          <ul className="space-y-3">
            {data.recent_check_ins.map((c) => (
              <li
                key={c.id}
                className="border-t border-zinc-100 pt-3 first:border-t-0 first:pt-0 dark:border-zinc-800"
              >
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {formatLocalDate(c.checked_in_date)}
                </p>
                <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                  {c.notes ?? "No notes"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-zinc-400">
          Log today&apos;s check-in
        </h2>
        {submitError && (
          <p className="mb-4 text-sm text-red-600 dark:text-red-400">{submitError}</p>
        )}
        <label
          htmlFor="notes"
          className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Notes{" "}
          <span className="font-normal text-zinc-400">(optional)</span>
        </label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={500}
          disabled={isSubmitting || data.checked_in_today}
          rows={3}
          placeholder="How did today go?"
          className="w-full resize-none rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400 disabled:cursor-not-allowed disabled:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
        />
        <p className="mb-4 mt-1 text-right text-xs text-zinc-400">
          {notes.length} / 500
        </p>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isDisabled}
          className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {buttonLabel}
        </button>
      </div>
    </div>
  );
}
