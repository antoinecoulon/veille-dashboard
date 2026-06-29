# Veille.dev — Dashboard

Dashboard de visualisation de la veille technologique. Il consomme l'API Worker Cloudflare
(`veille-analytics`) et affiche les articles collectés, avec filtres, pagination et (à venir)
des vues statistiques.

## Architecture

- **Nuxt 4** (dossier applicatif dans `app/`) + **Nuxt UI v4** (Tailwind v4).
- **Proxy Nitro (pattern BFF)** : le client n'appelle jamais le Worker en direct. Toutes les
  requêtes passent par `/api/**` (same-origin) et sont proxifiées vers le Worker via
  `routeRules` dans [`nuxt.config.ts`](nuxt.config.ts). Conséquence : pas de CORS à gérer, et
  l'URL du Worker reste côté serveur.
- **Composable** [`useVeilleApi`](app/composables/useVeilleApi.ts) (`baseURL: '/api'`) — une
  query réactive déclenche le refetch au changement de filtre/page.
- **Types partagés** dans [`shared/types/`](shared/types/).

## Design system

- **Layout sidebar** ([`app/layouts/default.vue`](app/layouts/default.vue)) construit avec les
  composants Dashboard de Nuxt UI (`UDashboardGroup` / `UDashboardSidebar` / `UNavigationMenu`),
  responsive (slideover sur mobile).
- **Palette** : primary **emerald**, neutral **slate** (couleurs Tailwind, définies dans
  [`app/app.config.ts`](app/app.config.ts)). Mode **clair** verrouillé
  (`colorMode` dans `nuxt.config.ts`). Effet « papier » via les tokens Nuxt UI : contenu en
  `bg-muted`, cartes en `bg-default`.
- **Typographies** : **Space Grotesk** (UI/titres) et **IBM Plex Mono** (labels/mono), définies
  dans [`app/assets/css/main.css`](app/assets/css/main.css) (`@theme`) et servies par
  `@nuxt/fonts` (cf. clé `fonts` de `nuxt.config.ts`).

## Développement

```bash
pnpm install
pnpm dev        # http://localhost:3000
```

### Variable d'environnement

| Variable | Rôle |
| --- | --- |
| `NUXT_PUBLIC_WORKER_BASE_URL` | URL de base du Worker. **Lue au build** pour construire la règle de proxy Nitro. À définir en local (`.env`) **et** dans Vercel. |

> Le préfixe `NUXT_PUBLIC_` est conservé pour la compatibilité de la variable existante, mais la
> valeur n'est **pas** exposée au client : elle vit dans `runtimeConfig` server-only et n'est
> utilisée que par le proxy.

## Build / déploiement

```bash
pnpm build      # build de production (preset Nitro auto-détecté par Vercel)
pnpm preview    # prévisualisation locale
```

Déploiement sur Vercel : connecter le repo, définir `NUXT_PUBLIC_WORKER_BASE_URL`, le reste est
auto-détecté.
