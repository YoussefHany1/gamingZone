import * as crypto from 'crypto';

function sha1Id(value: unknown, length = 36): string {
  return crypto.createHash('sha1').update(String(value)).digest('hex').substring(0, length);
}

export { sha1Id };
