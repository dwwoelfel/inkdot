import 'server-only';
import previewPublic from './instant-preview-public.json';
import previewServer from './instant-preview-server.json';

export function getInstantServerAppId() {
  return (
    process.env.NEXT_PUBLIC_INSTANT_APP_ID ||
    previewPublic.NEXT_PUBLIC_INSTANT_APP_ID
  );
}

export function getInstantAdminToken() {
  return (
    process.env.INSTANT_APP_ADMIN_TOKEN || previewServer.INSTANT_APP_ADMIN_TOKEN
  );
}
