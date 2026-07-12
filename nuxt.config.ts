// URL du Worker (server-only via runtimeConfig). Côté client on n'appelle jamais le
// Worker en direct : tout passe par /api (same-origin), ce qui supprime le besoin de
// CORS et garde l'URL du Worker côté serveur. Le proxy vers le Worker se fait dans des
// routes serveur explicites (server/api/articles|stats/*) qui vérifient d'abord la
// session — un proxy `routeRules` court-circuite les middlewares/hooks d'auth.
const workerBaseUrl = process.env.NUXT_PUBLIC_WORKER_BASE_URL || ''

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  // nitro-cloudflare-dev émule les bindings Cloudflare (D1 DB_AUTH) dans `nuxt dev`
  // via getPlatformProxy → accessibles sur event.context.cloudflare.env côté serveur.
  modules: ['@nuxt/ui', 'nitro-cloudflare-dev'],
  css: ['~/assets/css/main.css'],
  app: {
    head: {
      htmlAttrs: { lang: 'fr' },
      title: 'Veille.dev — Dashboard'
    }
  },
  fonts: {
    families: [
      { name: 'Space Grotesk', provider: 'google' },
      { name: 'IBM Plex Mono', provider: 'google' }
    ]
  },
  // Design clair (papier) — pas de bascule sombre pour l'instant
  colorMode: {
    preference: 'light',
    fallback: 'light'
  },
  runtimeConfig: {
    // server-only : non exposé au client
    workerBaseUrl,
    // Secrets Better Auth (server-only). Alimentés par NUXT_BETTER_AUTH_SECRET / _URL (.env).
    betterAuthSecret: '',
    betterAuthUrl: ''
  },
  vite: {
    optimizeDeps: {
      include: [
        'better-auth/vue',
      ]
    }
  }
})
