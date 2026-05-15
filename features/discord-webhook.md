# Discord webhook for new sketches

Post a message to a Discord channel whenever a new sketch is created in InstantDB.

## Trigger

Fires on the **`create`** action for the `sketches` namespace. This is the moment the user hits "Start" on `/new` and the first transaction sets `createdAt` + links the author. The thumbnail and `durationMs` are not yet present at this point — the Discord message will link to the sketch page, where the thumbnail will appear once recording finishes.

A sketch that gets abandoned mid-draw will still trigger a Discord notification. That's expected per product decision.

## Pieces

1. **`src/app/api/instant-webhook/route.ts`** — Next.js App Router handler that uses Instant's built-in webhook helpers (`db.webhooks.processRequest`) to verify the signature and dispatch to typed handlers. The `sketches/create` handler:
   - Looks up the sketch's author via the Admin SDK to get a handle/display name
   - POSTs a Discord-formatted JSON payload to `process.env.DISCORD_WEBHOOK_URL`
2. **`.env.example`** — Adds `DISCORD_WEBHOOK_URL=` to make the new env var discoverable.

Webhook registration is handled by the Instant CLI — no custom script needed.

## Env vars

- `DISCORD_WEBHOOK_URL` — Discord channel webhook URL (already provisioned by Discord)
- `INSTANT_APP_ADMIN_TOKEN` — already present; used by the admin SDK in the route + register script
- `NEXT_PUBLIC_INSTANT_APP_ID` — already present

The site origin used in Discord links is derived from the incoming webhook's `req.url`, so there's no `SITE_URL` env var to maintain.

## Upgrades bundled with this feature

Instant webhooks ship in `@instantdb/{admin,react}` **1.0.x** (we were on `0.22.x`). This feature requires updating to at least `1.0.34`.

## Discord payload

A single embed with:
- Title: `New sketch started`
- Author: the user's handle (falls back to "anonymous" if no handle)
- URL: `https://${HOST}/sketch/${sketchId}`
- Timestamp: `createdAt` from the record

## Operational notes

- Webhooks must be HTTPS with a public host — local development won't receive events unless you use a tunnel (ngrok, etc.) and register a separate webhook.
- After the route is deployed, register the webhook (once per environment) via the package scripts:

  ```
  pnpm webhook:add --url https://<your-host>/api/instant-webhook         # prod (.env)
  pnpm webhook:add:dev --url https://<your-host>/api/instant-webhook     # dev (.env.development)
  ```

  Both scripts pin `--namespaces sketches --actions create` so they don't drift. Manage existing webhooks via `pnpm instant-cli webhook list|disable|delete` directly.
