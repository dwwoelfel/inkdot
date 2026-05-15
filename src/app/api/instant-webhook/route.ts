import { init } from '@instantdb/admin';
import schema from '@/instant.schema';

const adminDb = init({
  appId: process.env.NEXT_PUBLIC_INSTANT_APP_ID!,
  adminToken: process.env.INSTANT_APP_ADMIN_TOKEN!,
  schema,
});

async function postSketchToDiscord(
  origin: string,
  sketchId: string,
  createdAt: number,
) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn('DISCORD_WEBHOOK_URL not set; skipping Discord notification');
    return;
  }

  const { sketches } = await adminDb.query({
    sketches: {
      author: {},
      $: { where: { id: sketchId } },
    },
  });
  const sketch = sketches[0];
  if (!sketch) return;

  const handle = sketch.author?.handle ?? null;
  const authorLabel = handle ? `@${handle}` : 'anonymous';
  const authorUrl = handle ? `${origin}/user/${handle}` : undefined;
  const avatarUrl = sketch.author?.imageURL ?? undefined;

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: `${authorLabel} on InkDot`,
      avatar_url: avatarUrl,
      embeds: [
        {
          title: 'New inkdot sketch started',
          url: `${origin}/sketch/${sketchId}`,
          author: { name: authorLabel, url: authorUrl, icon_url: avatarUrl },
          timestamp: new Date(createdAt).toISOString(),
        },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Discord webhook failed: ${res.status} ${text}`);
  }
}

export async function POST(req: Request) {
  const origin = new URL(req.url).origin;
  const { typedHandlers, combineHandlers } = adminDb.webhooks.helpers();
  const handlers = combineHandlers(
    typedHandlers('sketches', 'create', async (record) => {
      await postSketchToDiscord(
        origin,
        record.id,
        Number(record.after.createdAt),
      );
    }),
  );
  await adminDb.webhooks.processRequest(handlers, req);
  return new Response('ok');
}
