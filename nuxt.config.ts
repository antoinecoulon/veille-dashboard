// URL du Worker, lue à la config pour construire la règle de proxy Nitro.
// Côté client on n'appelle jamais le Worker en direct : tout passe par /api (same-origin),
// ce qui supprime le besoin de CORS et garde l'URL du Worker côté serveur.
const workerBaseUrl = process.env.NUXT_PUBLIC_WORKER_BASE_URL || ''

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxt/ui'],
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
    workerBaseUrl
  },
  routeRules: workerBaseUrl
    ? { '/api/**': { proxy: `${workerBaseUrl}/api/**` } }
    : {}
})
