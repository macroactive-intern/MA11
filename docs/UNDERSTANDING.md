What is the task asking me to build?

This task is asking me to build a small client-facing dashboard in Next.js.

The dashboard should let a client:

                                - View their current check-in streak.
                                - See whether they have completed a check-in for the current week.
                                - View their recent check-in history.
                                - Enter optional notes for today’s check-in.
                                - Log today’s check-in.
                                - See the dashboard update immediately after logging a check-in without a full page reload.

There is no external backend for this task. I will need to create a mock api using next.js route handlers and store the dashboard/check-in state in a module-level in-memory variable.

The main UI will use SWR to fetch dashboard data and mutate/revalidate it after check-in submission.

--------------------------------------------------------------------------------------------------------------------------------------------

What inputs does it take?

    GET /api/dashboard

This route takes no request body.

It returns the current dashboard state:

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

---------------------------------------------------------

    POST /api/check-in

This route logs today’s check-in.

Request body:

{
  "notes": "optional message"
}

Notes are optional and should be limited to 500 characters.

A successful response returns the full updated dashboard state from the server:

{
  "streak": 5,
  "weekly_complete": true,
  "checked_in_today": true,
  "recent_check_ins": [],
  "last_logged_at": "2026-06-16T09:30:00.000Z"
}

If today’s check-in already exists, the route should return:

409 Conflict

--------------------------------------------------------------------------------------------------------------------------------------------

What does the dashboard display?

                        1. Current streak, for example: 5-day streak
                        2. Weekly completion status:
                                            - Weekly check-in done
                                            - Weekly check-in needed
                        
                        3. Recent check-in history list:
                                            - Formatted local date
                                            - Notes preview
                        
                        4. Notes field:
                                            - Optional
                                            - Maximum 500 characters
                                            - Character counter updates as the user types
                        
                        5. Check-in button:
                                            Shows Log today's check-in normally
                                            Shows Logging… while the POST request is in flight
                                            Shows Already checked in today and is disabled when checked_in_today is true
                        
--------------------------------------------------------------------------------------------------------------------------------------------

Component boundary decisions

The dashboard page itself can stay as a Server Component by default because it does not need browser-only state directly.

The interactive dashboard UI should be a Client Component because it needs:
                        - UseSWR
                        - Client-side fetching
                        - Form state for notes
                        - Character counter state
                        - Loading/submitting state
                        - Button disabled state
                        - Client-side mutation after POST
                        - Client-side date formatting to avoid hydration mismatch issues

Planned boundary:

            app/page.tsx
            Server Component
            Responsible for rendering the page shell and importing the dashboard client component.

            components/DashboardClient.tsx
            Client Component
            Responsible for SWR data fetching, displaying dashboard state, notes input, submission flow, loading state, rollback/revalidation, and local date formatting.

I am choosing this boundary because the dashboard is highly interactive, and the date display must be handled on the client to avoid the server/client timezone mismatch

--------------------------------------------------------------------------------------------------------------------------------------------

Date formatting understanding

The API returns timestamps in UTC ISO format, for example:

2026-06-15T08:00:00.000Z

I will format dates inside the Client Component after hydration, not inside a Server Component.

The client component will convert the API date value into a user-facing local date string in the browser. This means the user sees the date according to their own timezone/locale.

--------------------------------------------------------------------------------------------------------------------------------------------

How already checked in today is detected and displayed

he UI should not calculate this by searching the history list.

The API response already includes:

                                "checked_in_today": true

The dashboard should trust that server value.

If checked_in_today is true:

The check-in button is disabled.
The button text becomes Already checked in today.
The notes field can still be visible, but the user cannot submit another check-in.
If the user somehow submits anyway and the API returns 409, the UI should show an error and restore/revalidate the dashboard state.

--------------------------------------------------------------------------------------------------------------------------------------------

Rollback strategy

The dashboard data will be stored in SWR’s cache on the client.

Before submitting a check-in, the current dashboard state is available from SWR.

When the user clicks Log today's check-in, the UI should:

                1. Set a submitting/loading state.
                2. Send POST /api/check-in with the notes value.
                3. Use the server response as the new dashboard data.
                4. Update SWR’s cache with that returned data.
                5. Revalidate or mutate so the history list is fresh.
                6. Clear the notes field after success.

If the POST request fails:

                1. The catch block should stop the submitting/loading state.
                2. The previous SWR data should remain visible or be restored.
                3. The UI should not keep a fake optimistic streak.
                4. The button should return to its correct state based on the real dashboard data.
                5. An error message should be shown to the user.
                6. SWR can revalidate GET /api/dashboard to make sure the UI is synced with the server state.

--------------------------------------------------------------------------------------------------------------------------------------------

last_logged_at is a true UTC timestamp, while checked_in_date represents the check-in calendar date.

I will still avoid server-side formatting and format the displayed date in the client component.

-----------------------------------------------------------------------------------

“Last 7 days” vs “Last 7 check-in entries”

The dashboard should show up to 7 recent check-ins returned by the API. Since the API is mocked, I will keep the returned list limited to the most recent 7 entries.

-----------------------------------------------------------------------------------

Exact weekly completion rule is not fully defined

This is a mocked dashboard task, the API state can calculate or store weekly_complete based on whether there is at least one check-in in the current week. I will use a simple consistent week calculation and keep the UI focused on displaying the API value.

The UI should not calculate this itself.

-----------------------------------------------------------------------------------

Exact notes preview length is not specified

I will show the note text directly if it is short and truncate long notes visually in the component. Since notes are max 500 characters, the preview does not need complicated pagination.

-----------------------------------------------------------------------------------

Error message wording is not specified

I will show a simple error such as:

Could not log check-in. Please try again.

For a 409 conflict, show:

You have already checked in today.

The dashboard should then revalidate so the button reflects the real checked_in_today state.

-----------------------------------------------------------------------------------

In-memory API state resets on server restart

The mock data will reset when the dev server restarts or the module reloads.

The task does not require a database.