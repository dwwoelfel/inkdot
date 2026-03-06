import { init } from '@instantdb/react/nextjs';
import schema from '../instant.schema';
import { getInstantAppId } from './instant-env-public';

export const db = init({
  appId: getInstantAppId(),
  schema,
  useDateObjects: true,
  firstPartyPath: '/api/instant',
});
