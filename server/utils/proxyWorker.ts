import type { H3Event } from 'h3'

// Vérifie la session puis relaie la requête au Worker analytics (same-origin → Worker).
// C'est LA protection des données : sans session, on renvoie 401 avant tout appel au Worker.
export async function proxyToWorker(event: H3Event) {
  const session = await serverAuth(event).api.getSession({ headers: event.headers })
  if (!session) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const base = useRuntimeConfig(event).workerBaseUrl
  if (!base) {
    throw createError({ statusCode: 500, statusMessage: 'URL du Worker indisponible' })
  }

  return proxyRequest(event, base + event.path)
}
