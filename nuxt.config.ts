// URL du Worker (server-only via runtimeConfig). Côté client on n'appelle jamais le
// Worker en direct : tout passe par /api (same-origin), ce qui supprime le besoin de
// CORS et garde l'URL du Worker côté serveur. Le proxy vers le Worker se fait dans des
// routes serveur explicites (server/api/articles|stats/*) qui vérifient d'abord la
// session — un proxy `routeRules` court-circuite les middlewares/hooks d'auth.

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  // Preset Nitro pour la prod : Worker Cloudflare (module) + assets statiques natifs
  // (Workers Assets). Sortie `.output/server/index.mjs` (Worker) + `.output/public`
  // (assets), déployée par `wrangler deploy` (main + [assets] dans wrangler.toml).
  nitro: {
    preset: 'cloudflare_module',
    // En-têtes de sécurité (C18). Mesuré le 2026-07-21 avant correction : la production
    // n'en renvoyait AUCUN — ni CSP, ni nosniff, ni Referrer-Policy. Ce sont des
    // instructions au navigateur : elles ne corrigent aucune faille du code, elles
    // réduisent ce qu'un défaut existant permettrait de faire.
    //
    // Posés par routeRules et non par un middleware : Nitro les applique aussi bien aux
    // réponses SSR qu'aux assets statiques (ils sont recopiés dans `.output/public/_headers`,
    // lu par Workers Assets), là où un middleware ne verrait jamais un fichier servi
    // directement par la plateforme. À ne pas confondre avec un proxy `routeRules`, qui
    // lui court-circuite les middlewares — c'est le piège de l'Étape 15, il ne s'applique
    // pas ici : poser un en-tête ne détourne aucune requête.
    routeRules: {
      '/**': {
        headers: {
          // Interdit au navigateur de deviner un type MIME : un fichier servi en
          // text/plain ne pourra pas être exécuté parce qu'il « ressemble » à du JS.
          'X-Content-Type-Options': 'nosniff',
          // Aucune mise en cadre : neutralise le détournement de clic. frame-ancestors
          // (dans la CSP) est la forme moderne, X-Frame-Options couvre les navigateurs
          // qui ne l'implémentent pas encore.
          'X-Frame-Options': 'DENY',
          // Ne fuite jamais le chemin consulté vers un site tiers ; conserve l'origine
          // seule en navigation externe, l'URL complète en interne.
          'Referrer-Policy': 'strict-origin-when-cross-origin',
          // Refuse par défaut les API sensibles du navigateur : aucune page du dashboard
          // n'utilise caméra, micro ou géolocalisation.
          'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          // Force HTTPS pendant deux ans, sous-domaines compris. Cloudflare sert déjà
          // exclusivement en TLS ; l'en-tête empêche la toute première requête en clair.
          'Strict-Transport-Security': 'max-age=63072000; includeSubDomains',
          // CSP. Toutes les ressources sont servies par l'origine : les polices sont
          // embarquées au build (43 fichiers woff2 dans /_fonts, vérifié sur la sortie
          // de `nuxt build`), il n'y a aucun CDN, et le client n'appelle jamais le Worker
          // en direct — tout passe par /api, same-origin.
          //
          // LIMITE ASSUMÉE : 'unsafe-inline' sur les scripts et les styles. Le rendu SSR
          // de Nuxt et le module de thème injectent des blocs inline ; les supprimer
          // demanderait des nonces par requête, donc un module de sécurité dédié et une
          // réécriture du rendu. La CSP conserve sa valeur contre l'injection de scripts
          // EXTERNES et contre l'exfiltration (connect-src), mais elle ne protège pas
          // d'un script inline injecté. C'est une atténuation, pas une garantie.
          'Content-Security-Policy': [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline'",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data:",
            "font-src 'self'",
            "connect-src 'self'",
            "worker-src 'self'",
            "frame-ancestors 'none'",
            "base-uri 'self'",
            "form-action 'self'",
            "object-src 'none'"
          ].join('; ')
        }
      }
    }
  },
  // nitro-cloudflare-dev émule les bindings Cloudflare (D1 DB_AUTH) dans `nuxt dev`
  // via getPlatformProxy → accessibles sur event.context.cloudflare.env côté serveur.
  modules: ['@nuxt/ui', 'nitro-cloudflare-dev', '@nuxt/eslint', '@vite-pwa/nuxt'],
  css: ['~/assets/css/main.css'],
  // Icônes servies depuis l'origine, pas depuis l'API publique d'Iconify.
  //
  // Découvert en écrivant la CSP (C18) : le bundle client embarquait trois points de
  // sortie tiers (api.iconify.design, api.simplesvg.com, api.unisvg.com), utilisés en
  // repli quand une icône manque au bundle serveur. Deux raisons de fermer cette porte
  // plutôt que de l'autoriser dans `connect-src` : chaque appel dirait à un tiers quelle
  // page un utilisateur consulte, et une ressource tierce chargée au runtime est une
  // dépendance qu'on ne maîtrise ni en disponibilité ni en contenu.
  //
  // `local` est possible sans rien installer de plus : la seule collection utilisée est
  // lucide (21 occurrences dans app/, aucune autre), et @iconify-json/lucide est déjà en
  // devDependency. Une icône d'une autre collection ne s'afficherait plus — c'est le
  // prix, et il est visible immédiatement.
  // `clientBundle.scan` plutôt que `serverBundle: 'local'` : mesuré, embarquer la
  // collection lucide entière côté serveur ajoutait 506 ko au bundle du Worker (2,71 →
  // 3,19 Mo) pour 21 icônes réellement utilisées. Le balayage à la compilation n'embarque
  // que celles-là. Contrepartie : une icône construite dynamiquement à l'exécution ne
  // serait pas vue par le balayage — il n'y en a aucune aujourd'hui.
  icon: { clientBundle: { scan: true }, serverBundle: false },
  app: {
    head: {
      htmlAttrs: { lang: 'fr' },
      title: 'Veille.dev — Dashboard',
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }
      ]
    }
  },
  fonts: {
    families: [
      { name: 'Space Grotesk', provider: 'google' },
      { name: 'IBM Plex Mono', provider: 'google' }
    ]
  },
  // PWA : manifest + service worker (généré par vite-plugin-pwa). Rend le dashboard
  // installable. Icône = le favicon SVG (pas de PNG, faute de rastériseur). L'app est
  // rendue côté serveur (SSR Worker) : on NE précache PAS le HTML et on laisse les
  // navigations passer au réseau (navigateFallback désactivé) pour ne pas court-circuiter
  // le SSR / les gardes d'auth.
  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'Veille.dev — Dashboard',
      short_name: 'Veille.dev',
      description: 'Dashboard de veille technologique et analytics',
      lang: 'fr',
      theme_color: '#10b981',
      background_color: '#ffffff',
      display: 'standalone',
      start_url: '/',
      icons: [
        { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' }
      ]
    },
    workbox: {
      navigateFallback: null,
      globPatterns: ['**/*.{js,css,svg,ico,woff2}']
    },
    devOptions: { enabled: false }
  },
  // Design clair (papier) — pas de bascule sombre pour l'instant
  colorMode: {
    preference: 'light',
    fallback: 'light'
  },
  runtimeConfig: {
    // server-only : non exposé au client. Override au runtime par NUXT_WORKER_BASE_URL
    // (convention Nuxt : NUXT_ + clé camelCase). Lu par proxyToWorker.
    workerBaseUrl: '',
    // Jeton de lecture du Worker analytics (C18), server-only comme le reste.
    // En production il vient du secret NUXT_WORKER_READ_TOKEN pose sur le Worker ;
    // ici, le repli pour `nuxt dev` (.env). Jamais dans runtimeConfig.public.
    workerReadToken: '',
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
