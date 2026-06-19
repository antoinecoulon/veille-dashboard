interface Article {
  id: number
  titre: string
  url: string
  resume: string
  source: string
  categorie_mistral: 'PRO' | 'PERSO' | 'LES_DEUX' | 'HORS_SCOPE'
  score_mistral: number
  themes_mistral: string[]
  themes_ml: string[] | null
  score_confiance_ml: number | null
  tags: string[]
  date_article: string
  date_collecte: string
}

export type { Article }
