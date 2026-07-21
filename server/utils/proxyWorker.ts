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
  const env = event.context.cloudflare?.env as
    | { NUXT_WORKER_BASE_URL?: string; NUXT_WORKER_READ_TOKEN?: string; ANALYTICS?: { fetch: typeof fetch } }
    | undefined
  const base = env?.NUXT_WORKER_BASE_URL || useRuntimeConfig(event).workerBaseUrl
  if (!base) {
    throw createError({ statusCode: 500, statusMessage: 'URL du Worker indisponible' })
  }

  // Jeton de lecture (C18). Les routes de lecture du Worker ne répondaient à aucune
  // condition : l'URL du Worker étant publique et versionnée, la session verifiée
  // ci-dessus ne protégeait que le chemin qui passe par ici. Le Worker exige désormais
  // cet en-tête ; ce proxy est le seul à l'émettre.
  //
  // Absent = on échoue ici, plutôt que de laisser partir une requête qui reviendra en
  // 401 et se lira comme une session expirée. Une erreur de configuration doit
  // ressembler à une erreur de configuration.
  //
  // `trim()` n'est pas de la coquetterie : poser ce secret en pipant une valeur dans
  // `wrangler secret put` y ajoute un saut de ligne, et le symptôme est trompeur — le
  // Worker répond 401, ce qui se lit comme une session expirée alors que la session est
  // valide et que seul l'octet de fin diffère. Un espace de bordure ne peut jamais faire
  // partie d'un jeton légitime ; le couper ici est sans risque et évite de rejouer le
  // diagnostic. Le secret a par ailleurs été réécrit proprement.
  const token = (env?.NUXT_WORKER_READ_TOKEN || useRuntimeConfig(event).workerReadToken)?.trim()
  if (!token) {
    throw createError({ statusCode: 500, statusMessage: 'Jeton de lecture du Worker indisponible' })
  }

  // En prod, on route via le service binding (fetch interne Worker→Worker) : deux Workers
  // d'un même compte ne peuvent pas s'appeler par leur URL *.workers.dev (erreur 1042). Le
  // binding ignore le hostname et route sur le chemin. En dev (Node), pas de binding → fetch
  // public classique vers l'URL du Worker (qui, lui, fonctionne hors contexte Worker).
  const fetcher = import.meta.dev ? undefined : env?.ANALYTICS
  return proxyRequest(event, base + event.path, {
    headers: { 'X-Dashboard-Token': token },
    ...(fetcher ? { fetch: fetcher.fetch.bind(fetcher) } : {})
  })
}
