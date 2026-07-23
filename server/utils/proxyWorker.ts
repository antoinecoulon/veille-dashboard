import type { H3Event } from 'h3'
import { ErreurRelais, preparerRelais, type EnvRelais } from './relais'

// Vérifie la session puis relaie la requête au Worker analytics (same-origin → Worker).
// C'est LA protection des données : sans session, on renvoie 401 avant tout appel au Worker.
//
// Ce fichier ne fait plus que des entrées-sorties. Les décisions — refuser, résoudre la cible,
// résoudre le jeton — vivent dans `preparerRelais` (server/utils/relais.ts), qui n'a aucune
// dépendance au runtime et porte les tests. Le découpage n'est pas cosmétique : il rend
// vérifiable l'affirmation de l'ADR D15 selon laquelle rien ne part vers le Worker sans
// session, en la rendant structurelle plutôt que dépendante de l'ordre des lignes ci-dessous.
export async function proxyToWorker(event: H3Event) {
  const session = await serverAuth(event).api.getSession({ headers: event.headers })

  const env = event.context.cloudflare?.env as
    | (EnvRelais & { ANALYTICS?: { fetch: typeof fetch } })
    | undefined

  let base: string
  let token: string
  try {
    ({ base, token } = preparerRelais(session, env, useRuntimeConfig(event)))
  } catch (err) {
    if (err instanceof ErreurRelais) {
      throw createError({ statusCode: err.statusCode, statusMessage: err.statusMessage })
    }
    throw err
  }

  // En prod, on route via le service binding (fetch interne Worker→Worker) : deux Workers
  // d'un même compte ne peuvent pas s'appeler par leur URL *.workers.dev (erreur 1042). Le
  // binding ignore le hostname et route sur le chemin. En dev (Node), pas de binding → fetch
  // public classique vers l'URL du Worker (qui, lui, fonctionne hors contexte Worker).
  const fetcher = import.meta.dev ? undefined : env?.ANALYTICS
  return proxyRequest(event, base + event.path, {
    // Le Worker exige cet en-tête sur ses routes de lecture ; ce proxy est le seul à l'émettre.
    headers: { 'X-Dashboard-Token': token },
    ...(fetcher ? { fetch: fetcher.fetch.bind(fetcher) } : {})
  })
}
