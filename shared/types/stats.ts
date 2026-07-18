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

export type { ThemeStat, SourceStat, TimelineStat, MlComparisonGlobal, MlComparisonTheme, MlComparison }