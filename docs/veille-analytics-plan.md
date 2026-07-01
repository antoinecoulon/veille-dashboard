# VeilleAnalytics — Plan d'action

Chaque étape est conçue pour être faisable en quelques heures à quelques jours. L'ordre est important : chaque étape dépend de la précédente. Les cases à cocher permettent de suivre l'avancement.

---

## Phase 1 — Fondations (Mars-Avril 2026) **OK**

L'objectif est d'avoir un pipeline fonctionnel de bout en bout : Node-RED -> Worker -> D1 -> données accessibles via API.

### Étape 1 — Setup des comptes et outils

- [x]  Créer un compte Cloudflare (gratuit, sans CB)
- [x]  Installer Wrangler CLI (`npm install -g wrangler`) et se connecter (`wrangler login`)
- [x]  Créer un repo GitHub public `veille-analytics`
- [x]  Initialiser le projet avec Wrangler (`wrangler init`)
- [x]  Vérifier que tout fonctionne : déployer un Worker "Hello World" avec `wrangler deploy`

**Résultat** : un Worker accessible sur `*.workers.dev`, un repo GitHub, les outils installés.

### Étape 2 — Créer la base D1

- [x]  Créer la base D1 via Wrangler (`wrangler d1 create veille-analytics`)
- [x]  Écrire le fichier de migration SQL avec le schéma (table `articles`, `dim_date`, `agg_quotidien`)
- [x]  Appliquer la migration (`wrangler d1 migrations apply`)
- [x]  Tester avec une insertion manuelle via Wrangler (`wrangler d1 execute`)

**Résultat** : une base D1 avec le schéma en place, vide mais prête.

### Étape 3 — Migration de l'historique JSON

- [x]  Écrire un script (Node.js ou Python) qui lit le fichier `articles.json`
- [x]  Pour chaque article : normaliser les champs (dates ISO, tags en lowercase, dédoublonnage variantes)
- [x]  Insérer les 270 articles dans D1 via le script (en batch, via Wrangler ou l'API D1)
- [x]  Vérifier le contenu : `SELECT COUNT(*) FROM articles`, quelques `SELECT` de contrôle

**Résultat** : les 270 articles historiques sont dans D1.

### Étape 4 — Worker ETL (endpoint d'ingestion)

- [x]  Coder la route `POST /api/ingest` dans le Worker
- [x]  Logique : valider le payload, normaliser les champs, insérer dans D1
- [x]  Dédoublonnage par URL (contrainte UNIQUE, gérer le conflit proprement)
- [x]  Créer un secret KV pour l'authentification par token
- [x]  Vérifier le token dans le header `Authorization` à chaque requête
- [x]  Tester avec curl ou Postman : envoyer un article de test, vérifier qu'il arrive dans D1
- [x]  Déployer avec `wrangler deploy`

**Résultat** : un endpoint fonctionnel qui reçoit des articles et les stocke dans D1.

### Étape 5 — Adapter Node-RED

- [x]  Ajouter un nœud HTTP Request après la classification Mistral
- [x]  Configurer le POST vers l'URL du Worker avec le token en header
- [x]  Mapper les champs du payload Node-RED vers le format attendu par le Worker
- [x]  Modifier le prompt Mistral pour ajouter un champ `theme` (parmi les 7 thématiques identifiées)
- [x]  Tester de bout en bout : lancer le pipeline, vérifier qu'un nouvel article arrive dans D1
- [x]  Garder le stockage JSON local et le mail en parallèle (ne rien casser)

**Résultat** : chaque article collecté par Node-RED est automatiquement poussé dans D1. Le pipeline existant continue de fonctionner normalement.

### Étape 6 — Reclassification thématique de l'historique

- [x]  Écrire un script qui parcourt les 270 articles dans D1
- [x]  Pour chaque article, appeler Mistral avec le titre + résumé et demander les thèmes
- [x]  Mettre à jour le champ `themes_mistral` dans D1
- [x]  Vérifier la distribution : combien d'articles par thème ?

**Résultat** : tous les articles (anciens et nouveaux) ont un champ `themes_mistral` renseigné.

---

## Phase 2 — API + Dashboard + CI/CD (Mai-Juin 2026)

L'objectif est d'exposer les données et de les visualiser, avec un pipeline de déploiement automatisé.

### Étape 7 — Worker API (endpoints de lecture)

- [x]  Ajouter les routes GET au Worker :
    - [x]  `GET /api/articles` — liste paginée avec filtres (date, thème, source, score)
    - [x]  `GET /api/stats/themes` — nombre d'articles par thème
    - [x]  `GET /api/stats/timeline` — volume d'articles par jour/semaine
        - [x]  Nécessite de convertir les dates du format RFC 822 vers ISO
    - [x]  `GET /api/stats/sources` — distribution par source
- [~]  Configurer le CORS (autoriser uniquement le domaine Vercel) — **contourné côté dashboard** : un proxy Nitro (`routeRules`) rend tous les appels same-origin, donc le CORS n'est plus bloquant. À ajouter sur le Worker seulement si on veut un jour l'appeler en direct depuis le navigateur.
- [x]  Tester chaque endpoint avec curl
- [x]  Déployer

**Résultat** : une API REST fonctionnelle qui expose les données de D1.

### Étape 8 — Dashboard v1

### Plan

### Partie A — Socle

### A1. Initialiser Nuxt 4

- [x]  Lancer le scaffolder (`nuxi init`), choisir pnpm
- [x]  Vérifier `nuxt: ^4.x` dans `package.json`
- [x]  `pnpm dev` → page de démo sur `localhost:3000`
- [x]  Comprendre la structure générée : `app.vue`, `nuxt.config.ts`, dossier `app/` (en Nuxt 4 le code applicatif vit dans `app/` par défaut — c'est le changement majeur vs Nuxt 3)

**Concepts à creuser :** structure de dossiers Nuxt 4, rôle de `app.vue`, `nuxt.config.ts`.

### A2. Configurer l'accès à l'API Worker

- [x]  Définir l'URL de base du Worker dans la config — finalement en `runtimeConfig` **server-only** (pas `public`) : le client n'appelle jamais le Worker en direct, tout passe par le proxy Nitro `/api`. L'URL reste donc côté serveur.
- [x]  Comprendre pourquoi une URL d'API publique va dans `runtimeConfig.public` et pas en dur — et pourquoi, ici, le pattern proxy (BFF) la garde côté serveur

**Concepts :** `runtimeConfig`, variables d'environnement (`.env` + `NUXT_PUBLIC_...`), proxy Nitro / pattern BFF.

### A3. Composable de fetch

- [x]  Créer un composable (dossier `composables/`, auto-importé) (`createUseFetch`)
- [x]  Une fonction par route : articles, stats/themes, stats/sources, stats/timeline
- [x]  Typer les réponses TypeScript (interfaces `Article`, `ThemeStat`, `SourceStat`...) — tu as les shapes
- [x]  Choisir entre `useFetch` et `$fetch` et savoir pourquoi

**Concepts :** auto-imports des composables, différence `useFetch` (réactif, lié au cycle SSR, dédup) vs `$fetch` (appel impératif). Règle simple à valider : `useFetch` dans le `<script setup>` au chargement de page, `$fetch` pour un appel déclenché par une action (clic, changement de filtre).

---

### Partie B — Vues

### B0. Routing

- [x]  Comprendre le routing par fichiers : dossier `pages/` → routes automatiques
- [x]  Décider de ta structure : une page par vue (`/`, `/distribution`, `/tendances`) ou une seule page à onglets
- [x]  Si `pages/` est utilisé, `app.vue` doit contenir `<NuxtPage />`
- [x]  Navigation entre pages avec `<NuxtLink>`

**Concepts :** file-based routing, `<NuxtPage>`, `<NuxtLink>`, layouts (optionnel).

> **App shell + design system en place** (d'après le wireframe Claude Design) :
> - Layout `app/layouts/default.vue` — **sidebar** via les composants Dashboard de Nuxt UI
>   (`UDashboardGroup`/`UDashboardSidebar`/`UNavigationMenu`), responsive (slideover mobile),
>   appliqué via `<NuxtLayout>` dans `app.vue`.
> - Nav : **Articles** actif ; groupe STATISTIQUES (Thèmes/Sources/Timeline) **désactivé**
>   jusqu'à B2/B3 (pas de liens 404).
> - Design system : palette **emerald** (primary) + **slate** (neutral) dans `app.config.ts`,
>   mode **clair** verrouillé, typos **Space Grotesk** + **IBM Plex Mono** via `@nuxt/fonts`,
>   effet papier (`bg-muted` contenu / `bg-default` cartes).
> - Reste de B0 (pages `/distribution`, `/tendances`) à faire avec B2/B3.

### B1. Vue détail — table paginée + filtres

La plus simple, commence par elle car elle mappe directement `/api/articles`.

- [x]  Récupérer les articles via le composable
- [x]  Afficher dans un tableau (Nuxt UI `UTable`) — responsive : table sur desktop, vue cartes sur mobile
- [x]  Gérer les états : chargement (`pending`), erreur (`error`), vide
- [x]  Pagination : state local (page courante), passer les params à l'API, composant `UPagination`
- [x]  Filtres : `USelect` liés en `v-model` (thème, source, catégorie, score min.), refetch au changement + bouton réinitialiser
- [x]  Comprendre comment `useFetch` se re-déclenche quand un param réactif change (query réactive via `computed`)
- [x]  Ajouter une option "Nombre d'articles par page" (sélecteur de taille de page, ex. 10/25/50, lié au param `limit`)

**Concepts :** `ref`/`reactive`, `v-model`, `v-for`, rendu conditionnel `v-if`/`v-else`, réactivité du refetch.

> **Note** — pièges rencontrés et corrigés sur cette vue : réactivité (ne pas figer les données avec `ref(response.value?.data)`, utiliser un `computed`) ; Reka UI interdit `value: ''` sur un `SelectItem` (utiliser une sentinelle `'all'`) ; Tailwind v4 ne met plus `cursor: pointer` par défaut sur les éléments cliquables.

### B2. Vue distribution — répartition par source et par thème

- [x]  Installer `vue-chartjs chart.js` (maintenant)
- [x]  Créer un composant graphe réutilisable (enregistrer les éléments Chart.js : `ArcElement`, `Tooltip`, `Legend` pour un doughnut) — deux composants `app/components/charts/Doughnut.vue` + `Bar.vue`, enregistrement centralisé dans `register.ts`
- [x]  Mapper `{ data: [{ theme, count }] }` → format Chart.js (`labels`, `datasets`)
- [x]  Deux graphes : Doughnut par thème, Bar (horizontal) par source — page `app/pages/distribution.vue`
- [x]  Envelopper dans `<ClientOnly>` (SSR + canvas)

**Concepts :** props de composant, `computed` pour transformer les données API en structure Chart.js, `<ClientOnly>`.

### B3. Vue tendances — évolution dans le temps

- [x]  Consommer `/api/stats/timeline` (volume quotidien)
- [x]  Graphe en ligne (`Line`, enregistrer `LineElement`, `PointElement`, `CategoryScale`, `LinearScale`)
- [x]  Mapper dates → axe X, counts → axe Y
- [x]  Même pattern `computed` + `<ClientOnly>`

**Concepts :** réutilisation du composant graphe, gestion de l'axe temporel.

---

### Partie C — Authentification (accès protégé)

Objectif : verrouiller l'accès au dashboard derrière une connexion. Un seul compte admin (toi), pas d'inscription publique. Comme le titre du projet est orienté sécurité, cette partie est l'occasion de démontrer des pratiques concrètes : hachage de mot de passe, sessions signées, cookies `HttpOnly`, protection des routes serveur.

> **Stack d'auth verrouillée** (décision « tout Cloudflare »)
> - **Où vit l'auth :** au niveau de **Nitro** (le serveur Nuxt), pas sur le Worker. Le dashboard passe déjà par un **proxy Nitro** (`/api/*`, pattern BFF) ; en mettant la session au même endroit, le cookie est **same-origin**, sans galère de cookies cross-domaine entre le domaine Pages du dashboard et `*.workers.dev`. Le Worker garde son token d'ingestion (KV `AUTH`) et n'a pas à connaître les utilisateurs.
> - **Base :** une **D1 dédiée à l'auth**, distincte de la base `veille-analytics` (articles), mais sur le **même compte Cloudflare**. On reste 100 % Cloudflare, et chaque repo possède proprement son schéma (pas de migrations croisées entre les deux repos).
> - **Accès à la base :** le dashboard étant hébergé sur **Cloudflare Pages** (cf. Partie D), il obtient un **binding D1 natif** — pas d'API REST à bricoler. Adaptateur **Kysely + `kysely-d1`** (léger, taillé pour D1).
> - **Package :** `better-auth` (le **cœur**, stable), monté dans une **route Nitro attrape-tout** (`server/api/auth/[...all]`). On écarte le module `@onmax/nuxt-better-auth` (encore en alpha) : plus de contrôle et de valeur pédagogique à câbler soi-même.

### C1. Installer et configurer Better Auth

- [ ]  Installer les dépendances : `better-auth`, `kysely`, `kysely-d1`
- [ ]  Créer la **D1 dédiée** (`wrangler d1 create veille-auth`) et déclarer son binding (`DB_AUTH`) dans le `wrangler.toml` du dashboard
- [ ]  Renseigner les secrets en `.env` (`BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`) — jamais commit ; le binding D1 remplace une URL/token de base
- [ ]  Configurer Better Auth avec l'adaptateur Kysely (`kysely-d1`) + monter le handler dans `server/api/auth/[...all].ts`
- [ ]  Générer et appliquer les migrations des tables Better Auth (`user`, `session`, `account`, `verification`) via `wrangler d1 migrations apply veille-auth`
- [ ]  Activer **uniquement** email + password, **désactiver l'inscription ouverte**

**Concepts :** route serveur attrape-tout Nitro, binding D1 (accès natif depuis Cloudflare), adaptateur Kysely, migrations D1, `runtimeConfig` server-only pour les secrets.

### C2. Page de connexion + état de session

- [ ]  Créer le client d'auth (`createAuthClient` de `better-auth/client`) dans un composable maison (ex. `useAuth`)
- [ ]  Page `/login` : formulaire email + mot de passe (`UForm` / `UInput` Nuxt UI)
- [ ]  Connexion via `authClient.signIn.email(...)`, redirection vers `/` au succès, gestion des erreurs (mauvais identifiants)
- [ ]  Afficher l'utilisateur connecté + bouton **Déconnexion** dans la sidebar (`authClient.useSession()`, `authClient.signOut()`)
- [ ]  Rediriger un visiteur déjà connecté hors de `/login`

**Concepts :** client Better Auth (`createAuthClient`), session réactive (`useSession`), appels `signIn` / `signOut`, redirections sûres.

### C3. Protéger les routes (le point critique sécurité)

- [ ]  Protéger **les pages** : un middleware Nuxt (`middleware/auth.ts` global) qui vérifie la session et redirige vers `/login` (sauf `/login` lui-même)
- [ ]  Protéger **le proxy `/api/*`** : sans ça, on contourne l'auth des pages en tapant l'API directement → un middleware serveur Nitro qui appelle `auth.api.getSession({ headers })` et renvoie **401** si absente
- [ ]  Vérifier qu'un `curl` non authentifié sur `/api/articles` renvoie bien **401**

**Concepts :** middleware Nuxt (route côté client/SSR), middleware serveur Nitro, vérification de session serveur (`auth.api.getSession`). Idée clé : **protéger l'UI ne suffit pas, il faut protéger la donnée**.

### C4. Créer le compte admin (seed)

- [ ]  Inscription fermée → créer ton compte via un **script de seed** ponctuel (ou une route d'inscription temporaire supprimée ensuite)
- [ ]  Vérifier que le mot de passe est bien **haché** en base (jamais en clair)

**Concepts :** seed, hachage (scrypt/argon2 selon Better Auth), moindre privilège (pas de signup public).

### C5. Durcissement

- [ ]  Cookies de session `HttpOnly` + `Secure` + `SameSite=Lax` (défauts Better Auth, à vérifier en prod)
- [ ]  Activer le **rate limiting** sur la connexion (anti brute-force)
- [ ]  Confirmer que la protection **CSRF** est active (Better Auth la gère ; vérifier `BETTER_AUTH_URL` / origines en prod)
- [ ]  Relire la surface d'attaque : aucun secret exposé au client, aucune route de données non protégée

**Concepts :** attributs de cookie, brute-force / rate limit, CSRF, revue de surface d'attaque.

**Résultat** : le dashboard est inaccessible sans connexion — **pages et API**. Un seul compte admin, mot de passe haché, sessions signées same-origin. Une base concrète pour argumenter la partie sécurité du M3.2.

---

### Partie D — Déploiement

### D1. Préparer le repo

- [ ]  `veille-dashboard` versionné sur GitHub (repo dédié ou sous-dossier — à décider)
- [ ]  `.env` dans `.gitignore`, vérifier qu'aucune URL/secret n'est commit

### D2. Cloudflare Pages

- [ ]  Configurer le preset Nitro `cloudflare-pages` (dans `nuxt.config.ts`) + créer le `wrangler.toml` du dashboard
- [ ]  Déclarer le binding **D1 auth** (`DB_AUTH`) et le flag `nodejs_compat` dans `wrangler.toml`
- [ ]  Créer le projet Pages et **connecter le repo GitHub** → auto-deploy sur push (équivalent Vercel)
- [ ]  Définir la variable d'env `NUXT_PUBLIC_WORKER_BASE_URL` (URL du Worker) dans le dashboard Pages — **lue au build** pour construire la règle de proxy Nitro (cf. `nuxt.config.ts`)
- [ ]  Ajouter les secrets d'auth dans Pages : `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` (domaine de prod). La base auth passe par le binding `DB_AUTH`, pas par une URL/token.
- [ ]  Appliquer les migrations d'auth sur la D1 distante (`wrangler d1 migrations apply veille-auth --remote`)
- [ ]  Vérifier le déploiement auto à chaque push
- [~]  CORS — **non nécessaire** grâce au proxy Nitro (appels same-origin). À ne reconsidérer que si on appelle le Worker en direct depuis le client.

**Concepts :** preset Nitro `cloudflare-pages`, bindings D1 (`wrangler.toml`, `nodejs_compat`), variables d'env / secrets en production, proxy Nitro (BFF).

## BONUS

- [ ] Trouver un moyen de démarrer automatiquement et régulièrement la collecte d'articles (Node-RED)
- [ ] Vérifier la documentation

---

### Deux pièges déjà identifiés à ne pas oublier

- **Encodage** `DÃ©veloppement` : à corriger côté Worker (header `charset=utf-8` / double-encodage) avant que ça pollue les labels.
- **CORS** : ~~ton Worker devra autoriser l'origine du dashboard en prod~~ → **résolu** via proxy Nitro côté dashboard (tous les appels sont same-origin, plus de CORS à gérer en dev comme en prod).

### Résumé de l'étape

- [x]  Initialiser un projet Nuxt.js
- [x]  Connecter au Worker API (composable `useFetch` ou `$fetch`)
- [x]  Vue tendances : graphique d'évolution par thème (librairie au choix : Chart.js, ou simple HTML/CSS)
- [x]  Vue distribution : répartition par source et par thème
- [x]  Vue détail : table paginée avec filtres (responsive desktop/mobile)
- [ ]  Déployer sur Cloudflare Pages (connecter le repo GitHub, déploiement automatique)

**Résultat** : un dashboard accessible en ligne qui visualise les données de veille.

### Étape 9 — GitHub Actions (CI/CD)

- [ ]  Créer `.github/workflows/deploy.yml`
- [ ]  Étapes : lint (ESLint) -> tests -> déploiement Worker (via Wrangler). Le dashboard se déploie via l'intégration Git native de Cloudflare Pages (auto sur push) ; Actions ne fait que lint + tests pour lui.
- [ ]  Ajouter les secrets dans GitHub (token Cloudflare pour le déploiement du Worker)
- [ ]  Tester : faire un push, vérifier que le pipeline passe au vert

**Résultat** : chaque push sur main déclenche lint + tests + déploiement automatique.

### Étape 10 — Tests

- [ ]  Installer Vitest
- [ ]  Tests unitaires : fonctions de normalisation (tags, dates, dédoublonnage)
- [ ]  Tests d'intégration : appeler les endpoints du Worker, vérifier les réponses
- [ ]  Ajouter les tests au pipeline GitHub Actions
- [ ]  Vérifier que le pipeline échoue si un test casse

**Résultat** : une base de tests qui tourne à chaque déploiement.

### Étape 11 — Terraform (IaC)

- [ ]  Installer Terraform CLI
- [ ]  Écrire la configuration : provider Cloudflare, ressources D1 (articles **+ D1 auth**), Worker, KV, **projet Pages** (dashboard) avec son binding D1
- [ ]  Importer les ressources existantes (`terraform import`)
- [ ]  Vérifier : `terraform plan` ne montre aucun changement (l'état correspond à ce qui existe)
- [ ]  Documenter : un README qui explique comment recréer l'infra from scratch

**Résultat** : toute l'infrastructure est décrite en code. `terraform apply` recrée tout.

---

## Phase 3 — ML + Analytics (Juillet-Août 2026)

L'objectif est de déployer un modèle ML, le comparer à Mistral, et enrichir le dashboard.

### Étape 12 — Annotation manuelle

- [ ]  Exporter ~100 articles depuis D1 (diversifiés en thèmes et sources)
- [ ]  Pour chaque article, attribuer manuellement les thèmes corrects (ground truth)
- [ ]  Format simple : CSV avec colonnes `id, themes_manuels`
- [ ]  Importer dans D1 ou garder en fichier séparé pour l'évaluation

**Résultat** : un jeu de validation indépendant de Mistral.

### Étape 13 — Déploiement zero-shot sur Hugging Face

- [ ]  Créer un Space sur Hugging Face (Gradio ou FastAPI)
- [ ]  Charger un modèle zero-shot (ex. `MoritzLaurer/deberta-v3-base-zeroshot-v2`)
- [ ]  Endpoint : reçoit titre + résumé, retourne les probabilités par thème
- [ ]  Tester sur quelques articles manuellement
- [ ]  Comparer avec les annotations manuelles : calculer la précision

**Résultat** : un modèle ML accessible via API qui classifie les articles par thème.

### Étape 14 — Intégration ML dans le pipeline

- [ ]  Modifier le Worker : après ingestion, appeler le Space HF pour obtenir les thèmes ML
- [ ]  Stocker les résultats dans D1 (`themes_ml`, `score_confiance_ml`)
- [ ]  Gérer le cas où le Space est en veille (cold start, retry)
- [ ]  Vérifier sur quelques articles que les deux classifications (Mistral et ML) sont bien présentes

**Résultat** : chaque article a une double classification : Mistral + ML.

### Étape 15 — Dashboard v2 (vue ML)

- [ ]  Ajouter la vue comparaison ML : accord/désaccord Mistral vs ML par thème
- [ ]  Afficher le taux de concordance global
- [ ]  Possibilité de filtrer les articles où ML et Mistral sont en désaccord
- [ ]  Ajouter un filtre "Machine Learning" sur la vue détail (table) pour exploiter les props ML : `themes_ml`, `score_confiance_ml` (ex. filtrer par thème ML, seuil de confiance min., présence/absence de classification ML) + colonnes correspondantes dans la table

**Résultat** : le dashboard montre visuellement la comparaison entre les deux approches.

### Étape 16 — PySpark (batch local)

- [ ]  Exporter les données de D1 en CSV
- [ ]  Écrire un script PySpark : fréquences par thème, cooccurrences de tags, tendances par fenêtre glissante
- [ ]  Exécuter localement, sauvegarder les résultats en CSV
- [ ]  Documenter le script et les résultats

**Résultat** : compétence C29 couverte. Résultats exploitables pour le M3.2.

### Étape 17 (optionnelle) — Fine-tuning

- [ ]  Si le volume de données est suffisant (~500+ articles) et si le temps le permet
- [ ]  Préparer le dataset d'entraînement (titre + résumé → thèmes Mistral comme labels)
- [ ]  Fine-tuner un petit modèle (DistilBERT ou CamemBERT-base)
- [ ]  Évaluer sur le jeu annoté manuellement
- [ ]  Comparer : zero-shot vs fine-tuné vs Mistral
- [ ]  Documenter les résultats, même négatifs

**Résultat** : une expérimentation documentée. Succès ou échec, c'est valorisable.

---

## Phase 4 — Finalisation (Sept-Nov 2026)

L'objectif est de produire les preuves et la documentation pour le M3.2.

### Étape 18 — Captures et preuves

- [ ]  Screenshots horodatés : dashboard, Cloudflare, GitHub Actions, HF Spaces
- [ ]  Enregistrement vidéo d'une démo complète (article collecté → D1 → dashboard)
- [ ]  Export des métriques : KPI avant/après (régularité collecte, concordance ML, couverture tests)
- [ ]  Sauvegarder le `terraform plan` comme preuve d'IaC

**Résultat** : un dossier de preuves solide, utilisable même si un service tombe avant la soutenance.

### Étape 19 — Documentation

- [ ]  README du repo : installation, architecture, déploiement
- [ ]  Documentation API : endpoints, paramètres, exemples de réponses
- [ ]  Section "Usage d'IA" pour le rapport (Claude et Mistral)

**Résultat** : documentation technique complète.

### Étape 20 — Rédaction M3.2

- [ ]  Reprendre la démarche PDCA avec les vrais chiffres
- [ ]  Plan : situation initiale (métriques du diagnostic)
- [ ]  Do : ce qui a été fait, couche par couche
- [ ]  Check : KPI mesurés, comparaison avant/après
- [ ]  Act : ajustements, limites, projections
- [ ]  Relecture et finalisation

**Résultat** : le rapport d'amélioration continue, prêt pour le M3.

---

## Résumé visuel

```
Mars          Avril         Mai           Juin          Juillet       Août          Sept          Oct-Nov
|-------------|-------------|-------------|-------------|-------------|-------------|-------------|
 Setup         Node-RED      API           Dashboard     Annotation    ML intégré    Captures      M3.2
 D1            adapté        endpoints     v1            manuelle      Dashboard v2  Documentation Soutenance
 Migration     Worker ETL    CI/CD         Terraform     Zero-shot     PySpark       Preuves
 270 articles  Reclassif.    Tests                       HF Spaces     (Fine-tuning)
```