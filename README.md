# Live sketching app with replay, powered by InstantDB Streams

[InkDot](https://inkdot.vercel.app)

[InstantDB](https://www.instantdb.com)
[InstantDB Docs](https://www.instantdb.com/docs)
[Stream Docs](https://www.instantdb.com/docs/streams)

This is a NextJS project scaffolded with create-instant-app.

To run the development server:
`npm run dev`

To push schema changes:
`npx instant-cli push`

To pull schema changes:
`npx instant-cli pull`

Got any feedback or questions? Join our [Discord](https://discord.gg/hgVf9R6SBm)

## Vercel preview deployments with ephemeral Instant apps

Vercel must run the repo build script so preview deployments can spin up a temporary Instant app and push schema/perms into it. This repo now sets `build` to `node scripts/vercel-build.mjs`, and `vercel.json` pins the build command to `pnpm run build`.

### Vercel env vars

- `NEXT_PUBLIC_INSTANT_APP_ID` and `INSTANT_APP_ADMIN_TOKEN`: optional fallback for production/static environments
- `INSTANT_CLI_AUTH_TOKEN`: optional; if set, it will be passed to `instant-cli --token ...`

How preview builds work:

1. If `VERCEL_ENV=preview` and Instant app credentials are not already set, `scripts/vercel-build.mjs` runs `instant-cli init-without-files --temp` to create an ephemeral app.
2. It pushes the local `instant.schema.ts` + `instant.perms.ts` with `instant-cli push all`.
3. It injects generated credentials into the build environment and then runs `next build`.
4. Next.js compiles the deployment with those env values, so both browser and server code in that preview deployment use the same ephemeral app credentials.

Temporary apps created with `--temp` expire automatically (>24h), so each preview deployment gets isolated data.
