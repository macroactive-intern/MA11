import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SWRConfig } from "swr";
import DashboardClient from "../components/DashboardClient";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const baseDashboard = {
  streak: 4,
  weekly_complete: true,
  checked_in_today: false,
  recent_check_ins: [
    { id: 1, checked_in_date: "2026-06-15", notes: null },
    { id: 2, checked_in_date: "2026-06-14", notes: "Good session" },
  ],
  last_logged_at: "2026-06-15T08:00:00.000Z",
};

const updatedDashboard = {
  streak: 5,
  weekly_complete: true,
  checked_in_today: true,
  recent_check_ins: [
    { id: 3, checked_in_date: "2026-06-16", notes: "New note" },
    { id: 1, checked_in_date: "2026-06-15", notes: null },
    { id: 2, checked_in_date: "2026-06-14", notes: "Good session" },
  ],
  last_logged_at: "2026-06-16T09:30:00.000Z",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeResponse(data: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
  } as unknown as Response;
}

function renderWithSWR() {
  return render(
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      <DashboardClient />
    </SWRConfig>
  );
}

// ── Test setup ────────────────────────────────────────────────────────────────

afterEach(() => {
  vi.restoreAllMocks();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("DashboardClient", () => {
  it("shows streak, weekly status, and recent check-in history", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(makeResponse(baseDashboard));

    renderWithSWR();

    expect(await screen.findByText(/4-day streak/i)).toBeInTheDocument();
    expect(screen.getByText(/weekly check-in done/i)).toBeInTheDocument();
    expect(screen.getByText(/good session/i)).toBeInTheDocument();
  });

  it("submits a check-in and updates the UI from the server response", async () => {
    let currentDashboard = baseDashboard;
    let resolvePost!: (r: Response) => void;
    const pendingPost = new Promise<Response>((res) => {
      resolvePost = res;
    });

    vi.spyOn(globalThis, "fetch").mockImplementation((_input, options) => {
      if (options?.method === "POST") return pendingPost;
      return Promise.resolve(makeResponse(currentDashboard));
    });

    const user = userEvent.setup();
    renderWithSWR();

    await screen.findByText(/4-day streak/i);

    // Type notes and verify character counter
    const textarea = screen.getByRole("textbox");
    await user.type(textarea, "New note");
    expect(screen.getByText("8 / 500")).toBeInTheDocument();

    // Click submit without awaiting — POST is still pending
    const submitButton = screen.getByRole("button", { name: /log today's check-in/i });
    user.click(submitButton);

    // While POST is in flight the button should show Logging…
    await screen.findByRole("button", { name: /logging/i });

    // Resolve POST with updated dashboard
    currentDashboard = updatedDashboard;
    resolvePost(makeResponse(updatedDashboard));

    // UI must reflect streak and history from the server response, not a client calculation
    expect(await screen.findByText(/5-day streak/i)).toBeInTheDocument();
    expect(screen.getByText(/new note/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /already checked in today/i })
    ).toBeDisabled();
  });

  it("disables the button and shows 'Already checked in today' when checked_in_today is true", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      makeResponse({ ...baseDashboard, checked_in_today: true })
    );

    renderWithSWR();

    const button = await screen.findByRole("button", {
      name: /already checked in today/i,
    });
    expect(button).toBeDisabled();
  });

  it("shows an error and preserves previous data when the POST fails", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((_input, options) => {
      if (options?.method === "POST") {
        return Promise.resolve(makeResponse({ error: "server error" }, 500));
      }
      return Promise.resolve(makeResponse(baseDashboard));
    });

    const user = userEvent.setup();
    renderWithSWR();

    await screen.findByText(/4-day streak/i);

    await user.click(
      screen.getByRole("button", { name: /log today's check-in/i })
    );

    // Error message appears and old streak remains — no fake updated state
    expect(await screen.findByText(/could not log check-in/i)).toBeInTheDocument();
    expect(screen.getByText(/4-day streak/i)).toBeInTheDocument();
  });
});
