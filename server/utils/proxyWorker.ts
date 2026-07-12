import type { H3Event } from 'h3'

// Vérifie la session puis relaie la requête au Worker analytics (same-origin → Worker).
// C'est LA protection des données : sans session, on renvoie 401 avant tout appel au Worker.
export async function proxyToWorker(event: H3Event) {
  const session = await serverAuth(event).api.getSession({ headers: event.headers })
  if (!session) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  // Sur Cloudflare, les variables du Worker vivent sur event.context.cloudflare.env et ne sont
  // pas propagées de façon fiable vers runtimeConfig au runtime. On lit donc l'env CF en priorité
  // (comme auth.ts pour DB_AUTH), avec runtimeConfig en repli pour le dev (.env via process.env).
  const env = event.context.cloudflare?.env as { NUXT_WORKER_BASE_URL?: string } | undefined
  const base = env?.NUXT_WORKER_BASE_URL || useRuntimeConfig(event).workerBaseUrl
  if (!base) {
    throw createError({ statusCode: 500, statusMessage: 'URL du Worker indisponible' })
  }

  return proxyRequest(event, base + event.path)
}
