import previewPublic from './instant-preview-public.json';

export function getInstantAppId() {
  return (
    process.env.NEXT_PUBLIC_INSTANT_APP_ID ||
    previewPublic.NEXT_PUBLIC_INSTANT_APP_ID
  );
}
