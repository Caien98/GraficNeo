# Migration: create trigger/function to send welcome message from official_GraficNeo

This migration creates a server-side Postgres function and trigger that will:

- Run AFTER INSERT on the `profiles` table.
- Attempt to find the official GraficNeo account with username = 'official_GraficNeo'.
- Create (or locate) a conversation between the official account and the newly created profile.
- Insert the exact welcome message (once) from the official account into the conversation.
- Insert a notification for the recipient (best-effort, ignored on error).

Reasoning and safety
- Running in the DB (server-side) avoids exposing service-role keys in the frontend.
- The function checks for the existence of the official account and safely does nothing if it is missing.
- Duplicate messages are prevented by checking for an existing message with the exact content.
- The trigger only runs on INSERTs to `profiles` and therefore will only fire when a new profile row is created.

Deployment notes
- Do NOT apply to production until you've verified in a staging/test database.
- Ensure a profile with username = 'official_GraficNeo' exists before testing.
- If your notifications schema differs, the migration ignores notification insertion errors so it doesn't block the message insertion.
