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

// Repartir page 1 dès qu'un filtre change
watch([theme, source, categorie, scoreMin], () => {
  page.value = 1
})

// Query réactive : les filtres « all » sont omis pour ne pas filtrer
const query = computed(() => {
  const q: Record<string, string | number> = { page: page.value, limit: limit.value }
  if (theme.value !== ALL) q.theme = theme.value
  if (source.value !== ALL) q.source = source.value
  if (categorie.value !== ALL) q.categorie = categorie.value
  if (scoreMin.value !== ALL) q.score_min = scoreMin.value
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

const hasFilters = computed(() =>
  theme.value !== ALL || source.value !== ALL || categorie.value !== ALL || scoreMin.value !== ALL
)
function resetFilters() {
  theme.value = ALL
  source.value = ALL
  categorie.value = ALL
  scoreMin.value = ALL
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

// --- Colonnes (desktop) ---
const columns: TableColumn<Article>[] = [
  { accessorKey: 'titre', header: 'Titre' },
  { accessorKey: 'source', header: 'Source' },
  { accessorKey: 'categorie_mistral', header: 'Catégorie' },
  { accessorKey: 'score_mistral', header: 'Score' },
  { accessorKey: 'themes_mistral', header: 'Thèmes' },
  { accessorKey: 'date_article', header: 'Date' }
]
</script>

<template>
  <div class="mx-auto w-full max-w-screen-2xl p-4 sm:p-6 space-y-6">
    <header class="space-y-1">
      <h1 class="text-2xl font-bold">Articles de veille</h1>
      <p class="text-sm text-muted">{{ total }} article{{ total > 1 ? 's' : '' }}</p>
    </header>

    <!-- Filtres -->
    <div class="grid grid-cols-2 lg:grid-cols-5 gap-3">
      <USelect v-model="theme" :items="themeItems" placeholder="Thème" class="w-full" />
      <USelect v-model="source" :items="sourceItems" placeholder="Source" class="w-full" />
      <USelect v-model="categorie" :items="categorieItems" placeholder="Catégorie" class="w-full" />
      <USelect v-model="scoreMin" :items="scoreItems" placeholder="Score min." class="w-full" />
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
        class="hidden lg:block w-full"
      >
        <template #titre-cell="{ row }">
          <ULink
            :to="row.original.url"
            target="_blank"
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
          <ULink :to="article.url" target="_blank" class="font-semibold leading-snug hover:text-primary block">
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
          <div class="flex items-center justify-between text-xs text-muted pt-1">
            <span>{{ article.source }}</span>
            <span>{{ formatDate(article.date_article) }}</span>
          </div>
        </UCard>
      </div>

      <!-- Pagination -->
      <div class="flex justify-center pt-2">
        <UPagination v-model:page="page" :total="total" :items-per-page="limit" />
      </div>
    </template>
  </div>
</template>
