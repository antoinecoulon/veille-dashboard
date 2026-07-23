interface ThemeStat {
  theme: string
  count: number
}

interface SourceStat {
  source: string
  count: number
}

interface TimelineStat {
  jour: string
  count: number
}

interface MlComparisonGlobal {
  total: number // articles en base
  compares: number // articles avec les deux classifications (themes_mistral ET themes_ml non null)
  accord_exact: number // ensembles de thèmes identiques
  chevauchement: number // au moins un thème commun
  jaccard_moyen: number // similarité moyenne (0-1)
}

interface MlComparisonTheme {
  theme: string
  accord: number // articles où Mistral ET ML ont ce thème
  mistral_seul: number // Mistral seulement
  ml_seul: number // ML seulement
}

interface MlComparison {
  global: MlComparisonGlobal
  par_theme: MlComparisonTheme[]
}

// Santé du pipeline (P3 — C33/C24). Les seuils sont appliqués côté Worker
// (src/lib/health.ts, cf. ADR D12) : le dashboard n'affiche que le verdict.
type StatutSante = 'ok' | 'degrade' | 'alerte'

interface PipelineHealth {
  statut: StatutSante // le pire des deux sous-statuts
  collecte: {
    // `dernier_article_collecte` et non `derniere_ingestion` : la mesure est un
    // MAX(date_collecte), donc la date du dernier article INSÉRÉ, pas celle de la dernière
    // passe de collecte — une passe qui ne ramène que des doublons n'écrit rien. Le champ a
    // été renommé côté Worker par l'ADR D12 précisément parce que l'ancien nom affirmait ce
    // que la mesure ne prouve pas. Ce type ne l'avait pas suivi (ADR D18).
    dernier_article_collecte: string | null // null si base vide
    jours_depuis: number | null
    statut: StatutSante // ok <= 3 j, degrade 4-14 j, alerte > 14 j
  }
  classification: {
    total: number
    ml_en_retard: number // themes_ml NULL > 24 h après collecte = échec avéré
    ml_sans_theme: number // themes_ml = [] : classifié, rien au-dessus de 0,7 — pas un échec
    mistral_manquants: number // résidu figé de la migration initiale — pas un échec
    statut: StatutSante // piloté par ml_en_retard seul, dès 1
  }
}

export type {
  ThemeStat,
  SourceStat,
  TimelineStat,
  MlComparisonGlobal,
  MlComparisonTheme,
  MlComparison,
  StatutSante,
  PipelineHealth
}