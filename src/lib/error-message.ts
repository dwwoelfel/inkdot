export function getErrorMessage(
  error: unknown,
  fallback = 'Something went wrong',
  permissionFallback = 'Permissions denied',
) {
  const normalizeMessage = (message: string) => {
    if (message.toLowerCase().includes('permission')) {
      return permissionFallback;
    }
    return message;
  };

  if (
    error &&
    typeof error === 'object' &&
    'body' in error &&
    error.body &&
    typeof error.body === 'object' &&
    'message' in error.body &&
    typeof error.body.message === 'string'
  ) {
    return normalizeMessage(error.body.message);
  }

  if (error instanceof Error && error.message) {
    return normalizeMessage(error.message);
  }

  return fallback;
}
