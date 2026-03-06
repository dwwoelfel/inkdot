import { createInstantRouteHandler } from '@instantdb/react/nextjs';
import { getInstantServerAppId } from '@/lib/instant-env-server';

export const { POST } = createInstantRouteHandler({
  appId: getInstantServerAppId(),
});
