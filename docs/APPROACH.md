## Goal

I am building a small client-facing dashboard in Next.js.

The dashboard will let a client:

* View their current check-in streak.
* See whether their weekly check-in is complete.
* View their recent check-in history.
* Enter optional notes for today’s check-in.
* Log today’s check-in.
* See the dashboard update immediately after logging a check-in without a full page reload.

There is no real backend or database for this task. I will use Next.js route handlers as a mock API and store the dashboard state in a module-level in-memory variable.

The frontend will use SWR to fetch dashboard data, submit check-ins, update the cache from the server response, and revalidate after mutation.

---

## Project structure

Planned file structure:

```txt
client-dashboard/
├── app/
│   ├── api/
│   │   ├── _data/
│   │   │   └── dashboardStore.ts
│   │   ├── dashboard/
│   │   │   └── route.ts
│   │   └── check-in/
│   │       └── route.ts
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   └── DashboardClient.tsx
├── test/
│   └── setup.ts
├── vitest.config.ts
├── UNDERSTANDING.md
├── ESTIMATE.md
├── APPROACH.md
└── BEFORE-AFTER.md
```

I may add small helper files if the component becomes too large, but I will keep the first version simple.

---

## Component boundary

### `app/page.tsx`

`app/page.tsx` will stay as a Server Component.

It will be responsible for:

* Rendering the page shell.
* Rendering a heading.
* Importing and displaying the dashboard client component.

It does not need `"use client"` because it will not use browser state, event handlers, SWR, or browser-only date formatting.

Example responsibility:

```txt
app/page.tsx
Server Component
Renders the page layout and <DashboardClient />
```

---

### `components/DashboardClient.tsx`

`DashboardClient.tsx` will be a Client Component.

It will have `"use client"` at the top.

This component needs to run in the browser because it will handle:

* `useSWR`
* client-side fetching
* notes input state
* character counter state
* submit/loading state
* button disabled state
* POST request handling
* SWR mutation/revalidation
* error messages
* local timezone date formatting

Example responsibility:

```txt
components/DashboardClient.tsx
Client Component
Handles dashboard data, interaction, mutation, rollback, and client-side date formatting.
```

This boundary matters because the brief specifically warns about date formatting causing server/client timezone mismatches. Formatting dates in the browser avoids pre-rendering the wrong local date on the server.

---

## Data model

There is no database.

The mock API state will live in a module-level variable inside a shared file such as:

```txt
app/api/_data/dashboardStore.ts
```

The shared mock state will use TypeScript types.

### `RecentCheckIn`

```ts
export type RecentCheckIn = {
  id: number;
  checked_in_date: string;
  notes: string | null;
};
```

`checked_in_date` will be stored as a date string like:

```txt
2026-06-15
```

The brief says all timestamps are UTC ISO format, but the example for `checked_in_date` is date-only. I will treat `checked_in_date` as the calendar date for the check-in.

---

### `DashboardResponse`

```ts
export type DashboardResponse = {
  streak: number;
  weekly_complete: boolean;
  checked_in_today: boolean;
  recent_check_ins: RecentCheckIn[];
  last_logged_at: string | null;
};
```

`last_logged_at` will be a UTC ISO timestamp, for example:

```txt
2026-06-15T08:00:00.000Z
```

---

### `CheckInRequest`

```ts
export type CheckInRequest = {
  notes?: string;
};
```

Rules for notes:

* Optional.
* Must be a string if provided.
* Maximum 500 characters.
* Empty string should be treated as no note and stored as `null`.

---

## Mock API routes

## `GET /api/dashboard`

This route returns the current dashboard state.

It takes no request body.

Response shape:

```json
{
  "streak": 4,
  "weekly_complete": true,
  "checked_in_today": false,
  "recent_check_ins": [
    { "id": 1, "checked_in_date": "2026-06-15", "notes": null },
    { "id": 2, "checked_in_date": "2026-06-14", "notes": "Good session" }
  ],
  "last_logged_at": "2026-06-15T08:00:00.000Z"
}
```

The route will make sure the returned `recent_check_ins` list is limited to the most recent 7 entries.

The UI will display whatever the API returns. The UI will not calculate the streak or weekly completion itself.

---

## `POST /api/check-in`

This route logs today’s check-in.

Request body:

```json
{
  "notes": "optional message"
}
```

On success, it returns the full updated dashboard state:

```json
{
  "streak": 5,
  "weekly_complete": true,
  "checked_in_today": true,
  "recent_check_ins": [],
  "last_logged_at": "2026-06-16T09:30:00.000Z"
}
```

On conflict, if today has already been checked in, it returns:

```txt
409 Conflict
```

On validation failure, for example notes over 500 characters, it should return:

```txt
400 Bad Request
```

or a JSON error response with a clear message.

---

## API state update rules

The shared store will include helper functions for:

* Getting today’s date.
* Checking whether today already exists in `recent_check_ins`.
* Limiting the returned history to 7 entries.
* Adding a new check-in.
* Returning a full `DashboardResponse`.

When `POST /api/check-in` succeeds:

1. Read and validate the request body.
2. Normalize notes:

   * trim whitespace
   * store empty notes as `null`
3. Check whether today already exists.
4. If today exists, return `409 Conflict`.
5. Create a new check-in entry.
6. Add it to the front of the history list.
7. Keep only the latest 7 entries.
8. Increase/update the streak in the mock state.
9. Set `weekly_complete` to `true`.
10. Set `checked_in_today` to `true`.
11. Set `last_logged_at` to `new Date().toISOString()`.
12. Return the full updated dashboard response.

The important rule is that the updated streak shown in the UI comes from this server response, not from the client calculating `oldStreak + 1`.

---

## SWR usage

The dashboard client component will use SWR like this:

```ts
const { data, error, isLoading, mutate } = useSWR<DashboardResponse>(
  "/api/dashboard",
  fetcher
);
```

The fetcher will:

* Call `fetch`.
* Throw an error if the response is not OK.
* Return the parsed JSON.

The dashboard state will live in SWR’s cache on the client.

The component will use SWR data to render:

* Streak
* Weekly completion status
* Checked-in-today button state
* Recent check-in history
* Last logged time if displayed

---

## Check-in submission strategy

When the user clicks `Log today's check-in`, the component will:

1. Clear any previous error message.
2. Set `isSubmitting` to `true`.
3. Send `POST /api/check-in` with the notes value.
4. Wait for the server response.
5. If the response is successful:

   * parse the returned dashboard state
   * call `mutate(updatedDashboard, false)` to update the local SWR cache immediately from the server response
   * optionally call `mutate()` again to revalidate and prevent stale data
   * clear the notes field
6. If the response fails:

   * show an error message
   * do not keep fake optimistic data
   * call `mutate()` to revalidate from `GET /api/dashboard`
7. Set `isSubmitting` back to `false` in a `finally` block.

The key point is that I am not permanently doing a client-calculated optimistic update. The successful UI state comes from the POST response.

---

## Revalidation strategy

After a successful POST:

* The UI will update immediately using the returned server response.
* SWR cache will be updated with `mutate(updatedDashboard, false)`.
* I will then revalidate if needed with `mutate()` so the displayed list cannot stay stale.

After a failed POST:

* The previous data should remain visible.
* The error message should appear.
* I will call `mutate()` to sync the UI with the current server state.

This covers the acceptance criteria that stale history after mutation is a failure and that failed submissions revert to the previous real state.

---

## Rollback strategy

The UI state is stored in SWR’s cache.

I am not planning to permanently apply an optimistic fake streak update before the server responds.

That means rollback is simpler:

* Before submit, the visible dashboard comes from SWR data.
* During submit, the button shows `Logging…`.
* If the POST succeeds, SWR is updated with the actual server response.
* If the POST fails, SWR still has the previous dashboard data.
* In the catch block, I show an error message and revalidate with `mutate()`.

If I decide to use SWR optimistic data, I will use `rollbackOnError: true`. However, the safer approach for this task is to wait for the server response and update the cache from that response.

---

## Date formatting and hydration approach

The brief warns that rendering date strings on the server can cause a hydration mismatch.

A hydration mismatch means the HTML generated by the server does not match what React renders in the browser during hydration.

Dates are risky because the server timezone and the user’s browser timezone may be different.

Example from the brief:

* Server renders: `June 16`
* Browser hydrates in UTC-8 and renders: `June 15`
* The user sees a flash of incorrect content

To avoid this, formatted dates will not be rendered in `app/page.tsx`.

Instead, `DashboardClient.tsx` will format dates in the browser.

I will use `Intl.DateTimeFormat` in the Client Component.

Example helper:

```ts
function formatLocalDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}
```

For a UTC ISO timestamp like:

```txt
2026-06-15T08:00:00.000Z
```

a user in Auckland, UTC+12, would see:

```txt
June 15, 2026, 8:00 PM
```

if time is displayed.

For history entries, the API example gives date-only values like:

```txt
2026-06-15
```

To avoid accidental timezone shifting with date-only strings, I will handle them carefully. I will either:

* display them as a local calendar date by constructing a local date from the year/month/day parts, or
* keep them as calendar-date values and format them without treating them as a midnight UTC timestamp.

This matters because `new Date("2026-06-15")` can be interpreted as UTC midnight, which may shift the displayed day for users behind UTC.

---

## Loading states

The dashboard will have these loading states:

### Initial loading

When SWR is loading and there is no data yet, show a loading message such as:

```txt
Loading dashboard…
```

### Fetch error

If the dashboard fails to load, show an error such as:

```txt
Could not load dashboard.
```

### Submitting

When the check-in POST is in flight:

* The button is disabled.
* The button text changes to:

```txt
Logging…
```

### Already checked in

When `checked_in_today` is true:

* The button is disabled.
* The button text changes to:

```txt
Already checked in today
```

### Submit error

If the POST fails:

* Show an error message.
* Keep the previous dashboard data visible.
* Revalidate the dashboard data.

For a generic error:

```txt
Could not log check-in. Please try again.
```

For a 409 conflict:

```txt
You have already checked in today.
```

---

## Button logic

The button label will be based on state:

```txt
if isSubmitting:
  "Logging…"

else if data.checked_in_today:
  "Already checked in today"

else:
  "Log today's check-in"
```

The button will be disabled when:

* `isSubmitting` is true
* `data.checked_in_today` is true
* the notes value is invalid
* the dashboard data has not loaded yet

The UI will trust `checked_in_today` from the API response. It will not decide this by searching the history list.

---

## Notes field

The notes field will be a textarea.

Rules:

* Optional.
* Maximum 500 characters.
* Shows a character counter.
* The counter updates as the user types.
* The submit button should not submit notes over 500 characters.

Because the textarea can use `maxLength={500}`, the browser will prevent typing past 500 characters in normal usage. I will still validate on the API route because client-side limits are not enough.

Example counter:

```txt
120 / 500
```

---

## History list

The dashboard will show up to 7 recent check-ins.

Each list item will show:

* Formatted local date
* Notes preview

If notes are empty or `null`, I will show something like:

```txt
No notes
```

If there are no recent check-ins, I will show an empty state such as:

```txt
No recent check-ins yet.
```

The notes preview length is not specified. I will keep this simple by showing the note text and using layout/truncation so very long notes do not break the card.

---

## Libraries and packages

### Next.js

Used for:

* App Router
* Server Components
* Client Components
* Route handlers for the mock API

### TypeScript

Used for:

* API response types
* component props/state types
* safer mock state handling

### Tailwind CSS

Used for:

* Dashboard layout
* Cards
* Button states
* Form styling
* Responsive layout

### SWR

Used for:

* Fetching `/api/dashboard`
* Storing dashboard data in client cache
* Updating the cache after POST
* Revalidating after mutation
* Avoiding full page reloads

### Vitest

Used for:

* Component tests

### React Testing Library

Used for:

* Testing UI behavior from the user’s point of view
* Querying visible text/buttons/inputs

### user-event

Used for:

* Typing notes
* Clicking the submit button

### jsdom

Used so React component tests can run in a browser-like environment.

---

## Component tests

I will write component tests for the important acceptance criteria.

Planned tests:

### Test 1 — Initial dashboard render

Checks that:

* The current streak appears.
* The weekly status appears.
* The recent check-in history appears.

### Test 2 — Check-in submission flow

Checks that:

* User can type notes.
* Character counter updates.
* Clicking the button shows `Logging…`.
* The mocked POST returns updated dashboard data.
* The updated streak displayed comes from the response.
* The new check-in appears in the history.
* The button updates after successful check-in.

### Test 3 — Already checked-in state

Checks that:

* When `checked_in_today` is true:

  * button says `Already checked in today`
  * button is disabled

### Test 4 — Failed POST rollback

Checks that:

* Initial streak is displayed.
* POST fails.
* No fake updated streak remains.
* Error message appears.
* Previous dashboard state is still shown.

I will use `SWRConfig` with an isolated cache provider in tests so SWR state does not leak between tests.

Example:

```tsx
<SWRConfig value={{ provider: () => new Map() }}>
  <DashboardClient />
</SWRConfig>
```

I will mock `fetch` for both GET and POST calls.

---

## Edge cases

### Already checked in today

The API returns `checked_in_today: true`.

The button must be disabled and show:

```txt
Already checked in today
```

If the user somehow sends another POST anyway, the API returns 409 and the UI revalidates.

---

### 409 conflict

If `POST /api/check-in` returns 409:

* Show a specific error message.
* Revalidate dashboard data.
* Do not keep any fake submitted state.

---

### Failed POST

If the POST request fails:

* Stop the loading state.
* Keep or restore the previous dashboard data.
* Show an error message.
* Revalidate from `GET /api/dashboard`.

---

### Stale history after mutation

After successful POST:

* Update SWR cache with the server response.
* Revalidate if needed.

The displayed history must reflect the successful POST response.

---

### Notes over 500 characters

The client prevents this with `maxLength={500}`.

The API also validates this because users can bypass frontend validation.

---

### Empty notes

Empty notes should be stored as `null`.

The history list can show:

```txt
No notes
```

---

### No recent check-ins

If the API returns an empty history list, the UI should not crash.

It should show an empty state.

---

### Date-only strings

`checked_in_date` values are date-only strings.

I need to avoid formatting them in a way that accidentally shifts the day due to timezone conversion.

I will format them in the Client Component and handle date-only values carefully.

---

### In-memory state reset

The mock API state is module-level only.

It will reset when:

* the dev server restarts
* the module reloads
* the runtime resets

This is acceptable because the task does not require a database.

---

### No authentication

The brief describes a client dashboard, but it does not require real authentication.

I will not implement auth for this task.

---

## Decisions from unclear parts of the brief

### “Last 7 days” vs “last 7 check-in entries”

The brief uses both ideas.

Decision:

* The API will return up to 7 recent check-in entries.
* The UI will display the entries returned by the API.
* I will keep the mock store limited to the latest 7 entries for the response.

---

### Weekly completion rule

The exact week start is not defined.

Decision:

* The API owns the `weekly_complete` value.
* The UI only displays it.
* For the mock API, successful check-in sets `weekly_complete` to `true`.
* I will not build complex locale-based week calculations unless needed.

---

### Notes preview length

The brief says notes preview but does not define the exact limit.

Decision:

* Show the notes text in the history item.
* Use simple truncation/styling to keep the layout clean.
* No separate preview algorithm is required unless the note is too long visually.

---

### Date formatting location

Decision:

* Do not format dates in Server Components.
* Format check-in dates in `DashboardClient.tsx`.
* Use browser locale/timezone.
* This prevents the server-rendered date from disagreeing with the browser-rendered date.

---

### Source of truth after POST

Decision:

* The server response is the source of truth.
* The client will not calculate the new streak.
* The UI will update SWR cache with the full response from `POST /api/check-in`.

---

## Acceptance criteria mapping

### Dashboard loads and shows streak/history

Handled by:

* `GET /api/dashboard`
* `useSWR`
* initial dashboard render test

---

### Clicking check-in updates without full reload

Handled by:

* `fetch('/api/check-in', { method: 'POST' })`
* SWR `mutate`
* no page navigation or reload

---

### Successful POST uses server response

Handled by:

* parsing POST response JSON
* passing it directly to SWR `mutate`

---

### Failed POST reverts

Handled by:

* no permanent optimistic update
* catch block
* error message
* SWR revalidation

---

### Already checked in button state

Handled by:

* checking `data.checked_in_today`
* disabled button
* `Already checked in today` label
* component test

---

### Logging state

Handled by:

* `isSubmitting` state
* disabled button
* `Logging…` label

---

### Dates displayed in local timezone with no hydration mismatch

Handled by:

* formatting dates in Client Component
* not rendering formatted dates in Server Component

---

### Fresh data after mutation

Handled by:

* updating cache from POST response
* revalidating with SWR

---

### Notes max 500 and counter

Handled by:

* textarea `maxLength`
* counter display
* API validation

---

### Component tests

Handled by:

* Vitest
* React Testing Library
* mocked fetch
* SWR isolated cache