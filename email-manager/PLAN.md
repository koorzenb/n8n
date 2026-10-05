# Gmail lunch email to Google Calendar plan

## Goal

Turn each dated lunch meal for each diner in a message from one known vendor into a one-day, all-day event on the user's Google Calendar. Process each matching email once, and surface messages that cannot be interpreted safely for review.

## Proposed n8n workflow

1. **Watch Gmail** for new messages from `info@nslunch.ca` with the subject `School lunches: Order Confirmation`. Ignore unrelated messages.
2. **Read the message body** as plain text where available; otherwise convert the HTML body to text. Retain the Gmail message ID and sender as processing metadata.
3. **Extract the HTML table** into normalized entries such as `{ diner: "Adriaan", date: "YYYY-MM-DD", meal: "Chicken Fried Rice" }`. The supplied table groups rows by diner using `rowspan`, so carry each diner name down through its grouped rows. Decode HTML entities (for example, `&amp;`), strip decorative images, and preserve the meal text. Prefer deterministic HTML parsing for this table structure.
4. **Validate and infer the year before creating events.** Require a real calendar date and a non-empty diner and meal for every entry. Since the table omits the year but includes a weekday, choose the next occurrence of each month/day after the email's received date, then verify it matches the listed weekday. If it does not, route the message for review instead of guessing.
5. **Prevent duplicate processing.** Store the Gmail message ID and processing result in persistent n8n storage. Use the diner, date, and meal as the entry identity when making retries safe, so a partial failure does not duplicate successful entries.
6. **Create one Calendar event for each diner and date row.** If two diners have meals on the same day, create two separate all-day events, even when their meals are identical. Include the diner in the title, for example `Lunch — Adriaan: Chicken Fried Rice`. For a one-day all-day event, set the start date to the meal date and the end date to the following date; Google Calendar treats the end date as exclusive. [Calendar event date fields](https://developers.google.com/workspace/calendar/api/concepts/events-calendars)
7. **Record the result.** Save the created event IDs against the Gmail message ID. Mark the email processed (for example, apply a Gmail label) only after all entries succeed. Route failures to an error/review path and make retries safe.

## Data and credentials

- Connect Gmail and Google Calendar through n8n's credential store and OAuth; do not put tokens or passwords in the workflow export or `PLAN.md`. The Gmail trigger and Calendar action use different Google credentials as the inbox belongs to `koorzenb@gmail.com` and calendar belong to  `KoorzenFamily` accounts.
- Target `KoorzenFamily` using Calendar ID `koorzenfamilie@gmail.com`. The Google account used by the Calendar credential owns it, so no calendar sharing is needed.
- Deliver the workflow as an importable n8n workflow file for the user's self-hosted Docker instance; configure Google credentials inside n8n after import.
- Request only the Gmail access needed to read the matching messages and the Calendar access needed to create events.
- Keep only the message ID, parsed date/meal entries, event IDs, processing status, and error details needed for deduplication and troubleshooting.

## Implementation sequence

1. Validate the year inference rule against a representative email and its received date.
2. Choose and implement the parser, including validation and a review path for ambiguous or malformed entries.
3. Configure Gmail and Calendar credentials in n8n, then build the trigger, parsing, deduplication, event creation, and success/error handling nodes.
4. Exercise the workflow against representative messages and a test calendar, including duplicate delivery, multiple meals, invalid dates, missing years, and partial Calendar failures.
5. Review the generated events and retry behavior, then enable processing on the intended calendar.

## Decisions to confirm during implementation

- Event title format (default: include both diner and meal).
- Whether failed or ambiguous messages should receive a Gmail review label and how the user wants to be notified.

## Completion criteria

- Each valid diner/date row creates exactly one all-day event on the correct date with both diner and meal in its title, including separate events for diners sharing a date.
- Reprocessing an email or retrying a partial failure does not create duplicate events.
- Invalid or ambiguous entries are reviewable and never silently converted into guessed dates.
- The workflow's successful, review, and failure paths can be distinguished in n8n.
