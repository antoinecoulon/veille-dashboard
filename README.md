# Veille.dev — Dashboard

[![CI](https://github.com/antoinecoulon/veille-dashboard/actions/workflows/ci.yml/badge.svg)](https://github.com/antoinecoulon/veille-dashboard/actions/workflows/ci.yml)
[![Security scan (ZAP)](https://github.com/antoinecoulon/veille-dashboard/actions/workflows/security-scan.yml/badge.svg)](https://github.com/antoinecoulon/veille-dashboard/actions/workflows/security-scan.yml)

Dashboard de visualisation de la veille technologique. Il consomme l'API Worker Cloudflare
(`veille-analytics`) et affiche les articles collectés, avec filtres et pagination, ainsi que
des vues statistiques (tendances par thème, distribution par source/thème).

## Architecture

- **Nuxt 4** (dossier applicatif dans `app/`) + **Nuxt UI v4** (Tailwind v4).
- **Proxy Nitro (pattern BFF)** : le client n'appelle jamais le Worker en direct. Toutes les
  requêtes passent par `/api/**` (same-origin) et sont proxifiées vers le Worker par des
  **routes serveur explicites** (`server/api/articles/*`, `server/api/stats/*` via
  [`server/utils/proxyWorker.ts`](server/utils/proxyWorker.ts)) qui **vérifient d'abord la
  session** (401 sinon). Conséquence : pas de CORS à gérer, l'URL du Worker reste côté serveur,
  et la donnée est protégée (pas seulement l'UI).
- **Service binding `ANALYTICS`** : en production, le proxy n'appelle **pas** le Worker par son
  URL publique. Deux Workers d'un même compte Cloudflare ne peuvent pas s'appeler par leur URL
  `*.workers.dev` (erreur 1042) ; le binding, déclaré dans [`wrangler.toml`](wrangler.toml),
  ignore le hostname et route sur le chemin. En dev (Node), pas de binding → `fetch` public
  classique.
- **Composable** [`useVeilleApi`](app/composables/useVeilleApi.ts) (`baseURL: '/api'`) — une
  query réactive déclenche le refetch au changement de filtre/page.
- **Types partagés** dans [`shared/types/`](shared/types/).

Le contrat de l'API consommée est documenté dans le dépôt amont :
[`veille-analytics/docs/003-api.md`](https://github.com/antoinecoulon/veille-analytics/blob/main/docs/003-api.md).

### Pages

`index` (articles), `distribution`, `tendances`, `comparaison-ml`, `sante`, plus `login`. Le
middleware global [`app/middleware/auth.global.ts`](app/middleware/auth.global.ts) redirige vers
`/login` toute page sans session — mais **côté client uniquement** (il rend la main sur le serveur)
et il ne protège que l'**UI**. La protection de la **donnée** est ailleurs, dans le proxy serveur,
et c'est elle qui compte.

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
| `NUXT_WORKER_READ_TOKEN` | Jeton de lecture du Worker (`READ_TOKEN` côté KV `AUTH`). Émis par le seul proxy, en en-tête `X-Dashboard-Token`. **Absent = 500** : une erreur de configuration doit ressembler à une erreur de configuration, pas à une session expirée. |
| `NUXT_BETTER_AUTH_SECRET` | Secret de signature des sessions Better Auth (`openssl rand -base64 32`). |
| `NUXT_BETTER_AUTH_URL` | Origine de l'app (`http://localhost:3000` en dev, l'URL de prod ensuite). Sert au CSRF et aux cookies. |

> Aucune de ces variables n'est exposée au client : elles vivent dans `runtimeConfig`
> (server-only), il n'y a **aucun `runtimeConfig.public`**. La convention `NUXT_` + clé camelCase
> permet leur override au runtime. À définir en local (`.env`) **et** sur le Worker de prod
> (Cloudflare → Settings → Variables).

> ⚠️ **Deux pièges déjà rencontrés, tous deux diagnostiqués à tort comme « session expirée ».**
> Poser un secret en pipant une valeur dans `wrangler secret put` y ajoute un **saut de ligne** ;
> le Worker répond alors 401 alors que la session est valide et que seul l'octet de fin diffère —
> d'où le `.trim()` défensif de [`server/utils/proxyWorker.ts`](server/utils/proxyWorker.ts). Et
> `wrangler deploy` **efface les variables plaintext** posées à la main dans l'interface : les
> reposer fait partie du déploiement, ou les passer en secrets.

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

L'authentification (Better Auth, cœur, sur une D1 dédiée) est décrite dans le
[plan d'action du projet](https://github.com/antoinecoulon/preparation-titre-eadl/blob/main/veille-analytics-side-project/veille-analytics-plan.md)
(Partie C). Le rate limiting est configuré en `storage: 'database'` et non en mémoire : sur des
isolates Cloudflare, un compteur en mémoire est contournable.

## Qualité et sécurité

Ce dépôt ne porte pas de tests unitaires — la logique métier vit dans le Worker amont, qui en a
120. Il porte en revanche deux workflows :

| Workflow | Jobs |
|---|---|
| [`.github/workflows/ci.yml`](.github/workflows/ci.yml) | `quality` (typecheck + lint), `security` (`pnpm audit --audit-level=high` + gitleaks), `sonar` (SonarCloud, cf. `sonar-project.properties`) |
| [`.github/workflows/security-scan.yml`](.github/workflows/security-scan.yml) | scan dynamique OWASP ZAP sur le dashboard déployé |

L'action Sonar est **épinglée par SHA** et non par tag : un tag est mutable, et une action de CI
lit le dépôt avec les droits du workflow.

```bash
pnpm typecheck
pnpm lint
```

Les relevés d'audit de dépendances avant/après et les en-têtes de réponse mesurés sont versionnés
dans [`data/security/`](data/security/).
