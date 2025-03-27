export async function scanAndCollectKeys(redis: any, pattern: string): Promise<string[]> {
  let cursor = '0';
  const keys: string[] = [];
  do {
    const [newCursor, foundKeys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', '10000');
    if (foundKeys.length > 0) {
      keys.push(...foundKeys);
    }
    cursor = newCursor;
  } while (cursor !== '0');
  return keys;
}
