<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'

const CATEGORIES = ['PRO', 'PERSO', 'LES_DEUX', 'HORS_SCOPE'] as const

// --- État des filtres + pagination (réactif) ---
// Valeur sentinelle « pas de filtre » (Reka UI interdit la chaîne vide en value)
const ALL = 'all'

const page = ref(1)
const limit = ref(10)
const theme = ref(ALL)
const source = ref(ALL)
const categorie = ref(ALL)
const scoreMin = ref(ALL)
// Filtres Machine Learning (Étape 15). `?desaccord=1` (lien depuis la page
// Comparaison ML) pré-active le filtre désaccord à l'arrivée sur la page.
const themeMl = ref(ALL)
const confianceMin = ref(ALL)
const mlPresence = ref(ALL)
const accordMl = ref(useRoute().query.desaccord === '1' ? 'desaccord' : ALL)

// Repartir page 1 dès qu'un filtre OU la taille de page change
watch([theme, source, categorie, scoreMin, themeMl, confianceMin, mlPresence, accordMl, limit], () => {
  page.value = 1
})

// Query réactive : les filtres « all » sont omis pour ne pas filtrer
const query = computed(() => {
  const q: Record<string, string | number> = { page: page.value, limit: limit.value }
  if (theme.value !== ALL) q.theme = theme.value
  if (source.value !== ALL) q.source = source.value
  if (categorie.value !== ALL) q.categorie = categorie.value
  if (scoreMin.value !== ALL) q.score_min = scoreMin.value
  if (themeMl.value !== ALL) q.theme_ml = themeMl.value
  if (confianceMin.value !== ALL) q.score_ml_min = confianceMin.value
  if (mlPresence.value !== ALL) q.ml = mlPresence.value
  if (accordMl.value === 'desaccord') q.desaccord = '1'
  return q
})

// useFetch se re-déclenche automatiquement quand `query` change
const { data: response, status, error } = useVeilleApi<PaginatedApiResponse<Article[]>>('/articles', { query })

const articles = computed(() => response.value?.data ?? [])
const total = computed(() => response.value?.pagination.total ?? 0)
const isPending = computed(() => status.value === 'pending')
const isEmpty = computed(() => !isPending.value && articles.value.length === 0)

// --- Options de filtres ---
const { data: sourcesResp } = useVeilleApi<ApiResponse<SourceStat[]>>('/stats/sources')

const themeItems = computed(() => [
  { label: 'Tous les thèmes', value: ALL },
  ...KNOWN_THEMES.map(t => ({ label: t, value: t }))
])
const sourceItems = computed(() => [
  { label: 'Toutes les sources', value: ALL },
  ...(sourcesResp.value?.data ?? []).map(s => ({ label: `${s.source} (${s.count})`, value: s.source }))
])
const categorieItems = [
  { label: 'Toutes catégories', value: ALL },
  ...CATEGORIES.map(c => ({ label: c, value: c }))
]
const scoreItems = [
  { label: 'Score min.', value: ALL },
  ...[1, 2, 3, 4, 5].map(n => ({ label: `≥ ${n}`, value: String(n) }))
]
// Valeurs numériques : `limit` est un ref(number), pas besoin de sentinelle ici
const pageSizeItems = [10, 25, 50].map(n => ({ label: `${n} / page`, value: n }))

// Options des filtres ML
const themeMlItems = computed(() => [
  { label: 'Tous les thèmes ML', value: ALL },
  ...KNOWN_THEMES.map(t => ({ label: t, value: t }))
])
const confianceItems = [
  { label: 'Confiance ML min.', value: ALL },
  ...['0.5', '0.7', '0.9'].map(v => ({ label: `≥ ${v.replace('.', ',')}`, value: v }))
]
const mlPresenceItems = [
  { label: 'Classification ML', value: ALL },
  { label: 'ML : présente', value: 'oui' },
  { label: 'ML : absente', value: 'non' }
]
const accordItems = [
  { label: 'Accord ML/Mistral', value: ALL },
  { label: 'En désaccord (aucun thème commun)', value: 'desaccord' }
]

const hasFilters = computed(() =>
  theme.value !== ALL || source.value !== ALL || categorie.value !== ALL || scoreMin.value !== ALL
  || themeMl.value !== ALL || confianceMin.value !== ALL || mlPresence.value !== ALL || accordMl.value !== ALL
)
function resetFilters() {
  theme.value = ALL
  source.value = ALL
  categorie.value = ALL
  scoreMin.value = ALL
  themeMl.value = ALL
  confianceMin.value = ALL
  mlPresence.value = ALL
  accordMl.value = ALL
}

// --- Helpers d'affichage ---
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

const categorieColor: Record<string, 'primary' | 'success' | 'warning' | 'neutral'> = {
  PRO: 'primary',
  PERSO: 'warning',
  LES_DEUX: 'success',
  HORS_SCOPE: 'neutral'
}
function scoreColor(score: number): 'success' | 'warning' | 'error' {
  if (score >= 4) return 'success'
  if (score === 3) return 'warning'
  return 'error'
}
// Confiance ML (0-1) : vert dès le seuil de classification (0,7, cf. Étape 13)
function confianceColor(score: number): 'success' | 'warning' | 'error' {
  if (score >= 0.9) return 'success'
  if (score >= 0.7) return 'warning'
  return 'error'
}

// --- Colonnes (desktop) ---
const columns: TableColumn<Article>[] = [
  { accessorKey: 'titre', header: 'Titre' },
  { accessorKey: 'source', header: 'Source' },
  { accessorKey: 'categorie_mistral', header: 'Catégorie' },
  { accessorKey: 'score_mistral', header: 'Score' },
  { accessorKey: 'themes_mistral', header: 'Thèmes' },
  { accessorKey: 'themes_ml', header: 'Thèmes ML' },
  { accessorKey: 'score_confiance_ml', header: 'Confiance' },
  { accessorKey: 'date_article', header: 'Date' }
]
</script>

<template>
  <div class="mx-auto w-full max-w-screen-2xl p-4 sm:p-6 space-y-6">
    <header class="flex items-end justify-between gap-4">
      <div class="space-y-1">
        <p class="font-mono text-xs text-muted">/articles</p>
        <h1 class="text-2xl font-bold tracking-tight">Articles</h1>
      </div>
      <p class="font-mono text-sm text-muted pb-1">{{ total }} article{{ total > 1 ? 's' : '' }}</p>
    </header>

    <!-- Filtres -->
    <div class="grid grid-cols-2 lg:grid-cols-5 gap-3">
      <USelect v-model="theme" :items="themeItems" placeholder="Thème" class="w-full" />
      <USelect v-model="source" :items="sourceItems" placeholder="Source" class="w-full" />
      <USelect v-model="categorie" :items="categorieItems" placeholder="Catégorie" class="w-full" />
      <USelect v-model="scoreMin" :items="scoreItems" placeholder="Score min." class="w-full" />
      <USelect v-model="themeMl" :items="themeMlItems" placeholder="Thème ML" class="w-full" />
      <USelect v-model="confianceMin" :items="confianceItems" placeholder="Confiance ML min." class="w-full" />
      <USelect v-model="mlPresence" :items="mlPresenceItems" placeholder="Classification ML" class="w-full" />
      <USelect v-model="accordMl" :items="accordItems" placeholder="Accord ML/Mistral" class="w-full" />
      <UButton
        v-if="hasFilters"
        label="Réinitialiser"
        color="neutral"
        variant="subtle"
        icon="i-lucide-x"
        class="justify-center"
        @click="resetFilters"
      />
    </div>

    <!-- Erreur -->
    <UAlert
      v-if="error"
      color="error"
      variant="subtle"
      icon="i-lucide-triangle-alert"
      title="Erreur lors du chargement des données."
    />

    <!-- État vide -->
    <div v-else-if="isEmpty" class="py-16 text-center text-muted">
      <UIcon name="i-lucide-inbox" class="size-10 mx-auto mb-2" />
      <p>Aucun article ne correspond à ces filtres.</p>
    </div>

    <template v-else>
      <!-- Vue tableau (desktop) -->
      <UTable
        :data="articles"
        :columns="columns"
        :loading="isPending"
        class="hidden lg:block w-full bg-default rounded-xl border border-default overflow-hidden"
      >
        <template #titre-cell="{ row }">
          <!-- `rel` posé explicitement, alors que NuxtLink l'ajoute déjà pour une cible
               externe : la protection ne doit pas dépendre d'un défaut de bibliothèque qu'une
               montée de version peut changer, et une affirmation de sécurité (ADR D14) doit
               être vérifiable dans le source, pas seulement dans le DOM rendu. -->
          <ULink
            :to="row.original.url"
            target="_blank"
            rel="noopener noreferrer"
            class="font-medium line-clamp-2 max-w-md hover:text-primary"
          >
            {{ row.original.titre }}
          </ULink>
        </template>
        <template #source-cell="{ row }">
          <span class="text-muted whitespace-nowrap">{{ row.original.source }}</span>
        </template>
        <template #categorie_mistral-cell="{ row }">
          <UBadge
            :color="categorieColor[row.original.categorie_mistral] ?? 'neutral'"
            variant="subtle"
            :label="row.original.categorie_mistral"
          />
        </template>
        <template #score_mistral-cell="{ row }">
          <UBadge :color="scoreColor(row.original.score_mistral)" variant="subtle" :label="String(row.original.score_mistral)" />
        </template>
        <template #themes_mistral-cell="{ row }">
          <div class="flex flex-wrap gap-1 max-w-xs">
            <UBadge
              v-for="t in row.original.themes_mistral"
              :key="t"
              color="neutral"
              variant="outline"
              size="sm"
              :label="t"
            />
          </div>
        </template>
        <template #themes_ml-cell="{ row }">
          <div v-if="row.original.themes_ml" class="flex flex-wrap gap-1 max-w-xs">
            <UBadge
              v-for="t in row.original.themes_ml"
              :key="t"
              color="primary"
              variant="outline"
              size="sm"
              :label="t"
            />
            <span v-if="!row.original.themes_ml.length" class="text-xs text-muted">aucun ≥ seuil</span>
          </div>
          <span v-else class="text-muted">—</span>
        </template>
        <template #score_confiance_ml-cell="{ row }">
          <UBadge
            v-if="row.original.score_confiance_ml !== null"
            :color="confianceColor(row.original.score_confiance_ml)"
            variant="subtle"
            :label="row.original.score_confiance_ml.toFixed(2)"
          />
          <span v-else class="text-muted">—</span>
        </template>
        <template #date_article-cell="{ row }">
          <span class="text-muted whitespace-nowrap">{{ formatDate(row.original.date_article) }}</span>
        </template>
      </UTable>

      <!-- Vue cartes (mobile) -->
      <div class="lg:hidden space-y-3">
        <template v-if="isPending && !articles.length">
          <USkeleton v-for="n in 5" :key="n" class="h-40 w-full" />
        </template>
        <UCard v-for="article in articles" :key="article.id" :ui="{ body: 'space-y-3' }">
          <ULink :to="article.url" target="_blank" rel="noopener noreferrer" class="font-semibold leading-snug hover:text-primary block">
            {{ article.titre }}
          </ULink>
          <p class="text-sm text-muted line-clamp-3">{{ article.resume }}</p>
          <div class="flex flex-wrap gap-1">
            <UBadge
              :color="categorieColor[article.categorie_mistral] ?? 'neutral'"
              variant="subtle"
              :label="article.categorie_mistral"
            />
            <UBadge :color="scoreColor(article.score_mistral)" variant="subtle" :label="`Score ${article.score_mistral}`" />
            <UBadge
              v-for="t in article.themes_mistral"
              :key="t"
              color="neutral"
              variant="outline"
              size="sm"
              :label="t"
            />
          </div>
          <div v-if="article.themes_ml" class="flex flex-wrap items-center gap-1">
            <span class="text-xs text-muted font-mono">ML</span>
            <UBadge
              v-for="t in article.themes_ml"
              :key="t"
              color="primary"
              variant="outline"
              size="sm"
              :label="t"
            />
            <span v-if="!article.themes_ml.length" class="text-xs text-muted">aucun ≥ seuil</span>
            <UBadge
              v-if="article.score_confiance_ml !== null"
              :color="confianceColor(article.score_confiance_ml)"
              variant="subtle"
              size="sm"
              :label="article.score_confiance_ml.toFixed(2)"
            />
          </div>
          <div class="flex items-center justify-between text-xs text-muted pt-1">
            <span>{{ article.source }}</span>
            <span>{{ formatDate(article.date_article) }}</span>
          </div>
        </UCard>
      </div>

      <!-- Pagination + taille de page -->
      <div class="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
        <UPagination v-model:page="page" :total="total" :items-per-page="limit" />
        <USelect v-model="limit" :items="pageSizeItems" class="w-32" />
      </div>
    </template>
  </div>
</template>
