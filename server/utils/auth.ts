import { betterAuth } from 'better-auth'
import type { H3Event } from 'h3'
import type { D1Database } from '@cloudflare/workers-types'

// Fabrique par requête : sous Cloudflare, le binding D1 n'existe que dans le contexte
// d'une requête (event.context.cloudflare.env), pas au chargement du module. On reconstruit
// donc l'instance Better Auth à chaque appel plutôt que d'exporter un singleton.
export function serverAuth(event: H3Event) {
  // Sur Cloudflare, binding D1 ET variables/secrets vivent sur event.context.cloudflare.env
  // (les overrides NUXT_ → runtimeConfig ne sont pas fiables au runtime sur le Worker). On lit
  // donc l'env CF en priorité, avec runtimeConfig en repli pour le dev (.env via process.env).
  const env = event.context.cloudflare?.env as
    | { DB_AUTH?: D1Database; NUXT_BETTER_AUTH_SECRET?: string; NUXT_BETTER_AUTH_URL?: string }
    | undefined
  const db = env?.DB_AUTH
  if (!db) {
    throw createError({ statusCode: 500, statusMessage: 'Binding D1 DB_AUTH indisponible' })
  }

  const config = useRuntimeConfig(event)
  const secret = env?.NUXT_BETTER_AUTH_SECRET || config.betterAuthSecret
  const baseURL = env?.NUXT_BETTER_AUTH_URL || config.betterAuthUrl

  // On passe le binding D1 brut : Better Auth le détecte (méthodes batch/exec/prepare)
  // et applique son dialect D1 interne (transactions désactivées par défaut, ce que D1 exige).
  return betterAuth({
    database: db,
    secret,
    baseURL,
    emailAndPassword: {
      enabled: true,
      // Inscription publique fermée : un seul compte admin, créé par un chemin contrôlé (C4).
      disableSignUp: true
    },
    // Anti-brute-force (C5) : Better Auth applique une règle stricte intégrée sur les routes
    // sensibles — /sign-in, /sign-up, /change-password, /change-email : max 3 tentatives / 10s.
    // enabled: true → actif aussi en dev (défaut Better Auth = prod uniquement).
    // storage: 'database' (table `rateLimit` en D1) car la mémoire n'est pas partagée entre
    // les isolates Cloudflare : un compteur en mémoire serait contournable et non fiable.
    rateLimit: {
      enabled: true,
      storage: 'database'
    }
  })
}
