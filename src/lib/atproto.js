let clientInstance = null
let BrowserOAuthClient = null

/**
 * Lazy-load the AT Protocol OAuth client module.
 * This keeps the 1.7MB @atproto bundle out of the initial page load.
 */
async function loadOAuthModule() {
  if (!BrowserOAuthClient) {
    const mod = await import('@atproto/oauth-client-browser')
    BrowserOAuthClient = mod.BrowserOAuthClient
  }
  return BrowserOAuthClient
}

/**
 * Get or create the singleton BrowserOAuthClient.
 * Must be awaited since it lazy-loads the module.
 */
export async function getOAuthClient() {
  if (clientInstance) return clientInstance

  const OAuthClient = await loadOAuthModule()
  const publicUrl = import.meta.env.VITE_PUBLIC_URL || window.location.origin

  clientInstance = new OAuthClient({
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
    handleResolver: 'https://public.api.bsky.app',
  })

  return clientInstance
}

/**
 * Lazy-load the AT Protocol Agent class.
 */
export async function createAgent(session) {
  const { Agent } = await import('@atproto/api')
  return new Agent(session)
}

/**
 * Resolve a handle to a DID using the public Bluesky API.
 * No @atproto imports needed — just a fetch call.
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
 */
export function bookRkey(openLibraryKey) {
  if (openLibraryKey && openLibraryKey.startsWith('/works/')) {
    return 'ol-' + openLibraryKey.replace('/works/', '')
  }
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}
