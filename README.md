# Veille.dev — Dashboard

Dashboard de visualisation de la veille technologique. Il consomme l'API Worker Cloudflare
(`veille-analytics`) et affiche les articles collectés, avec filtres, pagination et (à venir)
des vues statistiques.

## Architecture

- **Nuxt 4** (dossier applicatif dans `app/`) + **Nuxt UI v4** (Tailwind v4).
- **Proxy Nitro (pattern BFF)** : le client n'appelle jamais le Worker en direct. Toutes les
  requêtes passent par `/api/**` (same-origin) et sont proxifiées vers le Worker par des
  **routes serveur explicites** (`server/api/articles/*`, `server/api/stats/*` via
  [`server/utils/proxyWorker.ts`](server/utils/proxyWorker.ts)) qui **vérifient d'abord la
  session** (401 sinon). Conséquence : pas de CORS à gérer, l'URL du Worker reste côté serveur,
  et la donnée est protégée (pas seulement l'UI).
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

### Variables d'environnement (toutes server-only)

| Variable | Rôle |
| --- | --- |
| `NUXT_WORKER_BASE_URL` | URL de base du Worker analytics. Override **au runtime** de `runtimeConfig.workerBaseUrl`, lue par le proxy. |
| `NUXT_BETTER_AUTH_SECRET` | Secret de signature des sessions Better Auth (`openssl rand -base64 32`). |
| `NUXT_BETTER_AUTH_URL` | Origine de l'app (`http://localhost:3000` en dev, l'URL de prod ensuite). Sert au CSRF et aux cookies. |

> Aucune de ces variables n'est exposée au client : elles vivent dans `runtimeConfig`
> (server-only). La convention `NUXT_` + clé camelCase permet leur override au runtime.
> À définir en local (`.env`) **et** sur le Worker de prod (Cloudflare → Settings → Variables).

## Build / déploiement

```bash
pnpm build      # build de production (preset Nitro cloudflare_module → .output/)
pnpm preview    # prévisualisation locale
```

**Déploiement sur Cloudflare Workers** (Workers Builds, auto-deploy sur push) :

- Preset Nitro `cloudflare_module` → sortie `.output/server/index.mjs` (Worker) +
  `.output/public` (assets), déclarés dans [`wrangler.toml`](wrangler.toml) (`main` + `[assets]`).
- Le projet exécute `pnpm build` puis `npx wrangler deploy` (qui lit `wrangler.toml` :
  binding **D1 `DB_AUTH`** + flag `nodejs_compat`).
- Poser les 3 variables server-only (ci-dessus) sur le Worker en prod.
- Migrations d'auth distantes : `pnpm db:migrate:remote`.

L'authentification (Better Auth, cœur, sur une D1 dédiée) est décrite dans
[docs/veille-analytics-plan.md](docs/veille-analytics-plan.md) (Partie C).
