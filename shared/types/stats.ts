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
    derniere_ingestion: string | null // MAX(date_collecte), null si base vide
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