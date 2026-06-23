Step 1

    Project set up
                1. Start new Next.js project
                2. connect to Github repo
                                                                                                    10 mins

----------------------------------------------------------------------------------------------------------------

Step 2

    Documentation
                1. Write out the Understand.md
                2. Write out the Time Estimate.md
                3. Add the Ai Time estimate to the Estimate.md
                4. Write out the Aproach.md
                                                                                                        120 mins

----------------------------------------------------------------------------------------------------------------

Step 3

    Finish Project set up
                1. Install testing packages
                                    - vitest
                                    - @vitejs/plugin-react
                                    - @testing-library/react
                                    - @testing-library/user-event
                                    - jsdom
                2. Configure Vitest
                                    - Add vitest.config.ts.
                                    - Set test environment to jsdom.
                                    - Configure React plugin.
                                                                                                    20 mins

----------------------------------------------------------------------------------------------------------------

Step 4

    Component tests

                1. Create test setup file if needed, for example:
                                                                test/setup.ts
                
                2. Configure Testing Library cleanup
                3. Mock fetch.
                4. Wrap component in SWRConfig with isolated cache for tests.
                5. Test initial dashboard render:
                                                streak appears
                                                weekly status appears
                                                check-in history appears
                6. Test check-in submission flow:
                                                type notes
                                                character counter updates
                                                click button
                                                button shows Logging…
                                                mocked POST returns updated server state
                                                UI shows updated streak from response
                                                new history appears
                7. Test already checked-in disabled state:
                                                mock checked_in_today: true
                                                button says Already checked in today
                                                button is disabled
                8. Test failed POST rollback:
                                                initial data shows old streak
                                                POST fails
                                                UI does not keep fake updated streak
                                                error message appears
                                                                                                    105 mins

----------------------------------------------------------------------------------------------------------------

Step 5

    Mock API implementation

                1. Create a shared mock state module, for example:
                                                                    app/api/_data/dashboardStore.ts
                2. Define TypeScript types:
                                            DashboardResponse
                                            RecentCheckIn
                                            CheckInRequest
                3. Create initial mock state:
                                            streak
                                            weekly_complete
                                            checked_in_today
                                            recent_check_ins
                                            last_logged_at

                4. Implement helper to get today’s date.
                5. Implement helper to return only the latest 7 check-ins.
                6. Implement helper to calculate/check checked_in_today.
                7. Implement GET /api/dashboard.
                8. Implement POST /api/check-in.
                9. Validate notes:
                                    optional
                                    string
                                    max 500 characters
                10. Return 409 Conflict when today is already checked in.
                11. On successful POST:
                                        add today’s check-in
                                        update streak
                                        set weekly_complete to true
                                        set checked_in_today to true
                                        update last_logged_at
                                        return full updated dashboard state
                                                                                                    50 mins

----------------------------------------------------------------------------------------------------------------

Step 6 

    Page and component implementation

                1. Create/update app/page.tsx.
                2. Keep app/page.tsx as a Server Component.
                3. Render heading/page shell.
                4. Import and render DashboardClient.
                                                                                                    25 mins

----------------------------------------------------------------------------------------------------------------

Step 7

    Dashboard client component

                1. Create components/DashboardClient.tsx.
                2. Add "use client".
                3. Fetch dashboard data with SWR.
                4. Display loading state while data loads.
                5. Display current streak.
                6. Display weekly status.
                7. Display recent check-in history.
                8. Format check-in dates on the client.
                9. Display notes preview.
                10. Add notes textarea/input.
                11. Add character counter.
                12. Enforce max 500 characters.
                13. Add submit button.
                14. Button text logic:
                                        Log today's check-in
                                        Logging…
                                        Already checked in today
                15. Disable button when:
                                        submitting
                                        checked_in_today is true
                                        notes are invalid/too long
                16. Submit POST request.
                17. Use POST response to update SWR data.
                18. Clear notes after success.
                19. Show error message on failure.
                20. Revalidate after failure or conflict.
                                                                                                    35 mins

----------------------------------------------------------------------------------------------------------------

Step 8

    Styling

                1. Use Tailwind for layout.
                2. Create clear dashboard card layout.
                3. Style streak section.
                4. Style weekly status.
                5. Style history list.
                6. Style notes field and character counter.
                7. Style button states:
                                        default
                                        hover
                                        disabled
                                        loading
                8. Make layout readable on mobile and desktop.
                                                                                                    40 mins

----------------------------------------------------------------------------------------------------------------

Step 9

    Manual browser testing
                                                                                                    30 mins

----------------------------------------------------------------------------------------------------------------

Step 10 

    Quality checks
                                                                                                    30 mins

----------------------------------------------------------------------------------------------------------------

Step 11

    BEFORE-AFTER.md
                                                                                                    30 mins

----------------------------------------------------------------------------------------------------------------

                                                                                                    8.25 hrs

---------------------------------------------------------------------------------------------------------------- 

## AI Estimate

The AI estimate for this task is around 8 hours 40 minutes.

The project itself is small, but there are a few details that add risk:

- The dashboard uses SWR, so mutation and revalidation need to be handled carefully.
- The POST response must be treated as the source of truth instead of calculating the new streak on the client.
- Failed submissions need rollback/revalidation behavior.
- Dates need to be formatted in the Client Component to avoid hydration mismatch.
- Component tests need to mock fetch and isolate SWR cache between tests.

The largest parts of the work are expected to be documentation, component tests, and the interactive dashboard client component.

## Reconciled Estimate

My manual estimate was 8.25 hours.

The AI estimate was 8 hours 40 minutes.

I will use a reconciled estimate of 8.5 hours.

This gives enough time for the required documentation, mock route handlers, SWR dashboard UI, component tests, manual testing, and BEFORE-AFTER.md.