export type RecentCheckIn = {
  id: number;
  checked_in_date: string;
  notes: string | null;
};

export type DashboardResponse = {
  streak: number;
  weekly_complete: boolean;
  checked_in_today: boolean;
  recent_check_ins: RecentCheckIn[];
  last_logged_at: string | null;
};

export type CheckInRequest = {
  notes?: string;
};

// ── Internal state ────────────────────────────────────────────────────────────

type State = {
  streak: number;
  weekly_complete: boolean;
  recent_check_ins: RecentCheckIn[];
  last_logged_at: string | null;
  next_id: number;
};

function utcDateString(daysAgo = 0): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

const state: State = {
  streak: 3,
  weekly_complete: false,
  recent_check_ins: [
    { id: 1, checked_in_date: utcDateString(1), notes: null },
    { id: 2, checked_in_date: utcDateString(2), notes: "Good session" },
    { id: 3, checked_in_date: utcDateString(3), notes: "Great progress" },
  ],
  last_logged_at: new Date(Date.now() - 86400000).toISOString(),
  next_id: 4,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

export function getTodayDate(): string {
  return utcDateString(0);
}

export function isCheckedInToday(): boolean {
  const today = getTodayDate();
  return state.recent_check_ins.some((c) => c.checked_in_date === today);
}

function latest7(checkIns: RecentCheckIn[]): RecentCheckIn[] {
  return checkIns.slice(0, 7);
}

export function getDashboardResponse(): DashboardResponse {
  return {
    streak: state.streak,
    weekly_complete: state.weekly_complete,
    checked_in_today: isCheckedInToday(),
    recent_check_ins: latest7(state.recent_check_ins),
    last_logged_at: state.last_logged_at,
  };
}

export function addCheckIn(notes: string | null): DashboardResponse {
  const entry: RecentCheckIn = {
    id: state.next_id++,
    checked_in_date: getTodayDate(),
    notes,
  };

  state.recent_check_ins = latest7([entry, ...state.recent_check_ins]);
  state.streak += 1;
  state.weekly_complete = true;
  state.last_logged_at = new Date().toISOString();

  return getDashboardResponse();
}
