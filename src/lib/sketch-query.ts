export function viewerVotesQuery(userId?: string) {
  if (!userId) {
    return {};
  }

  return {
    votes: {
      $: {
        where: { user: userId },
      },
    },
  } as const;
}

export function sketchQuery(sketchId: string, userId?: string) {
  return {
    sketches: {
      stream: {},
      thumbnail: {},
      author: {},
      remixOf: { author: {} },
      ...viewerVotesQuery(userId),
      $: { where: { id: sketchId } },
    },
  } as const;
}
