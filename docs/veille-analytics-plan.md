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

### B1. Vue détail — table paginée + filtres

La plus simple, commence par elle car elle mappe directement `/api/articles`.

- [x]  Récupérer les articles via le composable
- [x]  Afficher dans un tableau (Nuxt UI `UTable`) — responsive : table sur desktop, vue cartes sur mobile
- [x]  Gérer les états : chargement (`pending`), erreur (`error`), vide
- [x]  Pagination : state local (page courante), passer les params à l'API, composant `UPagination`
- [x]  Filtres : `USelect` liés en `v-model` (thème, source, catégorie, score min.), refetch au changement + bouton réinitialiser
- [x]  Comprendre comment `useFetch` se re-déclenche quand un param réactif change (query réactive via `computed`)
- [ ]  Ajouter une option "Nombre d'articles par page" (sélecteur de taille de page, ex. 10/25/50, lié au param `limit`)

**Concepts :** `ref`/`reactive`, `v-model`, `v-for`, rendu conditionnel `v-if`/`v-else`, réactivité du refetch.

> **Note** — pièges rencontrés et corrigés sur cette vue : réactivité (ne pas figer les données avec `ref(response.value?.data)`, utiliser un `computed`) ; Reka UI interdit `value: ''` sur un `SelectItem` (utiliser une sentinelle `'all'`) ; Tailwind v4 ne met plus `cursor: pointer` par défaut sur les éléments cliquables.

### B2. Vue distribution — répartition par source et par thème

- [ ]  Installer `vue-chartjs chart.js` (maintenant)
- [ ]  Créer un composant graphe réutilisable (enregistrer les éléments Chart.js : `ArcElement`, `Tooltip`, `Legend` pour un doughnut)
- [ ]  Mapper `{ data: [{ theme, count }] }` → format Chart.js (`labels`, `datasets`)
- [ ]  Deux graphes : un par thème, un par source (Doughnut ou Bar)
- [ ]  Envelopper dans `<ClientOnly>` (SSR + canvas)

**Concepts :** props de composant, `computed` pour transformer les données API en structure Chart.js, `<ClientOnly>`.

### B3. Vue tendances — évolution dans le temps

- [ ]  Consommer `/api/stats/timeline` (volume quotidien)
- [ ]  Graphe en ligne (`Line`, enregistrer `LineElement`, `PointElement`, `CategoryScale`, `LinearScale`)
- [ ]  Mapper dates → axe X, counts → axe Y
- [ ]  Même pattern `computed` + `<ClientOnly>`

**Concepts :** réutilisation du composant graphe, gestion de l'axe temporel.

---

### Partie C — Déploiement

### C1. Préparer le repo

- [ ]  `veille-dashboard` versionné sur GitHub (repo dédié ou sous-dossier — à décider)
- [ ]  `.env` dans `.gitignore`, vérifier qu'aucune URL/secret n'est commit

### C2. Vercel

- [ ]  Connecter le repo à Vercel
- [ ]  Laisser Vercel auto-détecter Nuxt (preset Nitro `vercel`)
- [ ]  Définir la variable d'env `NUXT_PUBLIC_WORKER_BASE_URL` (URL du Worker) dans le dashboard Vercel — **lue au build** pour construire la règle de proxy Nitro (cf. `nuxt.config.ts`)
- [ ]  Vérifier le déploiement auto à chaque push
- [~]  Tester le CORS — **plus nécessaire** grâce au proxy Nitro (appels same-origin). À ne reconsidérer que si on appelle le Worker en direct depuis le client.

**Concepts :** presets Nitro, variables d'env en production, proxy Nitro (BFF), CORS.

---

### Deux pièges déjà identifiés à ne pas oublier

- **Encodage** `DÃ©veloppement` : à corriger côté Worker (header `charset=utf-8` / double-encodage) avant que ça pollue les labels.
- **CORS** : ~~ton Worker devra autoriser l'origine Vercel en prod~~ → **résolu** via proxy Nitro côté dashboard (tous les appels sont same-origin, plus de CORS à gérer en dev comme en prod).

### Résumé de l'étape

- [x]  Initialiser un projet Nuxt.js
- [x]  Connecter au Worker API (composable `useFetch` ou `$fetch`)
- [ ]  Vue tendances : graphique d'évolution par thème (librairie au choix : Chart.js, ou simple HTML/CSS)
- [ ]  Vue distribution : répartition par source et par thème
- [x]  Vue détail : table paginée avec filtres (responsive desktop/mobile) — reste l'option "articles par page"
- [ ]  Déployer sur Vercel (connecter le repo GitHub, déploiement automatique)

**Résultat** : un dashboard accessible en ligne qui visualise les données de veille.

### Étape 9 — GitHub Actions (CI/CD)

- [ ]  Créer `.github/workflows/deploy.yml`
- [ ]  Étapes : lint (ESLint) -> tests -> déploiement Worker (via Wrangler) -> déploiement dashboard (via Vercel)
- [ ]  Ajouter les secrets dans GitHub (token Cloudflare, token Vercel)
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
- [ ]  Écrire la configuration : provider Cloudflare, ressources D1, Worker, KV
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