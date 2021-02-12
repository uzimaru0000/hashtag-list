export const querySplit = <T>(query: string): T =>
  query
    .split('&')
    .map((x) => x.split('=') as [string, string])
    .reduce(
      (acc, [key, value]) => ({ ...acc, [key]: decodeURIComponent(value) }),
      {} as T
    );

export const queryBuilder = (
  queries: { [key in string]: { toString: () => string } }
) =>
  Object.keys(queries).length === 0
    ? ''
    : '?' +
      Object.entries(queries)
        .map(([key, value]) => `${key}=${encodeURIComponent(value.toString())}`)
        .join('&');
