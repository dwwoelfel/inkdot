import { viewerVotesQuery } from '@/lib/sketch-query';

export const DEFAULT_PAGE_SIZE = 54;

export type GalleryCursor = [string, string, unknown, number];

export function newestPageQuery(
  user?: { id?: string | null; type?: string | null } | null,
  cursors?: {
    first?: number;
    after?: GalleryCursor;
    last?: number;
    before?: GalleryCursor;
  },
) {
  return {
    sketches: {
      stream: {},
      thumbnail: {},
      author: {},
      remixOf: { author: {} },
      ...viewerVotesQuery(user),
      $: {
        order: { createdAt: 'desc' as const },
        first: DEFAULT_PAGE_SIZE,
        ...(cursors ?? {}),
      },
    },
  };
}

export function topPageQuery(
  user?: { id?: string | null; type?: string | null } | null,
) {
  return {
    sketches: {
      stream: {},
      thumbnail: {},
      author: {},
      remixOf: { author: {} },
      ...viewerVotesQuery(user),
      $: {
        order: { score: 'desc' as const },
        first: DEFAULT_PAGE_SIZE,
      },
    },
  };
}

export function bestPageQuery(
  user?: { id?: string | null; type?: string | null } | null,
) {
  return {
    sketches: {
      stream: {},
      thumbnail: {},
      author: {},
      remixOf: { author: {} },
      ...viewerVotesQuery(user),
      $: {
        where: { flagged: { $ne: true } },
        order: { score: 'desc' as const },
        first: 1,
      },
    },
  };
}

export function upvotedPageQuery(
  user: { id: string; type: 'user' },
  cursors?: {
    first?: number;
    after?: GalleryCursor;
    last?: number;
    before?: GalleryCursor;
  },
) {
  const userId = user.id;

  return {
    votes: {
      sketch: {
        stream: {},
        thumbnail: {},
        author: {},
        remixOf: { author: {} },
        ...viewerVotesQuery(user),
      },
      $: {
        where: { user: userId },
        order: { createdAt: 'desc' as const },
        first: DEFAULT_PAGE_SIZE,
        ...(cursors ?? {}),
      },
    },
  };
}
