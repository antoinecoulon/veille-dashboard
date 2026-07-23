// Cœur décisionnel du relais vers le Worker analytics, isolé du runtime h3.
//
// Même répartition que « le SQL compte, le TypeScript juge » côté Worker
// (veille-analytics/src/lib/health.ts) : `proxyToWorker` fait les entrées-sorties, cette
// fonction prend les décisions. Elle n'importe ni h3, ni Nuxt, ni Better Auth, donc elle se
// teste sans lancer d'application — ce qui était jusqu'ici impossible, et c'est la raison
// pour laquelle le dépôt n'avait aucun test sur son chemin le plus sensible.
//
// L'ordre des contrôles est la propriété qu'on veut démontrer, pas un détail d'écriture :
// la session est jugée AVANT que la moindre adresse de Worker soit résolue, et
// `proxyToWorker` n'atteint `proxyRequest` que si cette fonction retourne. Un refus ne peut
// donc pas partir en sous-requête (ADR D15).

/**
 * Refus du relais, converti en `createError` par l'appelant.
 *
 * Classe dédiée plutôt que `createError` directement : c'est ce qui garde ce module libre de
 * toute dépendance au runtime, donc testable.
 */
export class ErreurRelais extends Error {
  constructor(readonly statusCode: number, readonly statusMessage: string) {
    super(statusMessage)
    this.name = 'ErreurRelais'
  }
}

/** Variables lues sur `event.context.cloudflare.env` en production. */
export interface EnvRelais {
  NUXT_WORKER_BASE_URL?: string
  NUXT_WORKER_READ_TOKEN?: string
}

/** Repli `runtimeConfig` (server-only), alimenté par `.env` en développement. */
export interface ConfigRelais {
  workerBaseUrl?: string
  workerReadToken?: string
}

export interface Relais {
  base: string
  token: string
}

/**
 * Décide si la requête peut être relayée, et avec quelle cible et quel jeton.
 *
 * @throws {ErreurRelais} 401 sans session, 500 si la configuration est incomplète.
 */
export function preparerRelais(
  session: unknown,
  env: EnvRelais | undefined,
  config: ConfigRelais
): Relais {
  // Premier contrôle, avant toute résolution de configuration. C'est LA protection des
  // données : sans session, rien ne part vers le Worker.
  if (!session) {
    throw new ErreurRelais(401, 'Unauthorized')
  }

  // Sur Cloudflare, les variables du Worker vivent sur event.context.cloudflare.env et ne sont
  // pas propagées de façon fiable vers runtimeConfig au runtime. On lit donc l'env CF en
  // priorité (comme auth.ts pour DB_AUTH), avec runtimeConfig en repli pour le dev.
  const base = env?.NUXT_WORKER_BASE_URL || config.workerBaseUrl
  if (!base) {
    throw new ErreurRelais(500, 'URL du Worker indisponible')
  }

  // Jeton de lecture (C18). Absent = on échoue ICI, plutôt que de laisser partir une requête
  // qui reviendrait en 401 et se lirait comme une session expirée. Une erreur de
  // configuration doit ressembler à une erreur de configuration.
  //
  // `trim()` n'est pas de la coquetterie : poser ce secret en pipant une valeur dans
  // `wrangler secret put` y ajoute un saut de ligne, et le symptôme est trompeur — le Worker
  // répond 401, ce qui se lit comme une session expirée alors que la session est valide et que
  // seul l'octet de fin diffère. Un espace de bordure ne peut jamais faire partie d'un jeton
  // légitime ; le couper ici est sans risque et évite de rejouer le diagnostic.
  //
  // Le `trim()` précède le test de présence : un secret qui ne contient QUE des blancs est une
  // configuration absente, pas un jeton. L'ordre inverse laisserait partir une chaîne vide.
  const token = (env?.NUXT_WORKER_READ_TOKEN || config.workerReadToken)?.trim()
  if (!token) {
    throw new ErreurRelais(500, 'Jeton de lecture du Worker indisponible')
  }

  return { base, token }
}
