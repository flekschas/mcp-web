/**
 * Room identifiers for sharded bridge deployments.
 *
 * Single-process bridges (Node, Bun) hold every session in one memory
 * space and ignore rooms. Sharded bridges — currently Cloudflare Durable
 * Objects — have to pick an object when the WebSocket upgrade arrives, which is
 * before the frontend has sent its `authenticate` message. The frontend
 * therefore puts a room in the connection URL.
 *
 * The room is derived from the auth token because every cross-session feature
 * in the bridge is already scoped to one token. Deriving rather than sending
 * the token keeps the secret out of URLs and access logs.
 *
 * Two tokens with the same room share an object. Sessions are still matched by
 * full token, so a collision costs isolation, not correctness.
 */

const ROOM_ID_LENGTH = 32;

/**
 * Derives the room for an auth token, or `undefined` without Web Crypto.
 *
 * Both sides have to agree on the room, and the only hash available everywhere
 * a bridge runs is SHA-256. An insecure context — a plain `http://` page on a
 * LAN address — has no `crypto.subtle`, so no room is sent.
 */
export async function deriveRoomId(
  authToken: string,
): Promise<string | undefined> {
  const subtle = globalThis.crypto?.subtle;

  if (!subtle) {
    return undefined;
  }

  const data = new TextEncoder().encode(authToken);
  const digest = await subtle.digest('SHA-256', data);

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, ROOM_ID_LENGTH);
}
