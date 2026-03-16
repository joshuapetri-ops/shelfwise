import { BrowserOAuthClient } from '@atproto/oauth-client-browser'

let clientInstance = null

/**
 * Get or create the singleton BrowserOAuthClient.
 * The client handles PKCE, DPOP, token storage (IndexedDB), and refresh.
 */
export function getOAuthClient() {
  if (clientInstance) return clientInstance

  const publicUrl = import.meta.env.VITE_PUBLIC_URL || window.location.origin

  clientInstance = new BrowserOAuthClient({
    clientMetadata: {
      client_id: `${publicUrl}/client-metadata.json`,
      client_name: 'Shelfwise',
      client_uri: publicUrl,
      logo_uri: `${publicUrl}/favicon.svg`,
      redirect_uris: [`${publicUrl}/oauth/callback`],
      response_types: ['code'],
      grant_types: ['authorization_code', 'refresh_token'],
      scope: 'atproto transition:generic',
      token_endpoint_auth_method: 'none',
      application_type: 'web',
      dpop_bound_access_tokens: true,
    },
    handleResolver: 'https://bsky.social',
  })

  return clientInstance
}

/**
 * Resolve a handle to a DID using the public Bluesky API.
 */
export async function resolveHandle(handle) {
  const clean = handle.replace(/^@/, '').trim()
  const res = await fetch(
    `https://public.api.bsky.app/xrpc/com.atproto.identity.resolveHandle?handle=${encodeURIComponent(clean)}`
  )
  if (!res.ok) throw new Error(`Failed to resolve handle: ${clean}`)
  const data = await res.json()
  return data.did
}

/**
 * Derive a deterministic rkey from an Open Library work key.
 * /works/OL12345W → ol-OL12345W
 * Falls back to a timestamp-based key for local books.
 */
export function bookRkey(openLibraryKey) {
  if (openLibraryKey && openLibraryKey.startsWith('/works/')) {
    return 'ol-' + openLibraryKey.replace('/works/', '')
  }
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}
