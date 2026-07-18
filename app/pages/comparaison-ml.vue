<script setup lang="ts">
const { data: response, status, error } = useVeilleApi<ApiResponse<MlComparison>>('/stats/ml-comparison')

const comparison = computed(() => response.value?.data)
const isPending = computed(() => status.value === 'pending')

// Pourcentages rapportés aux articles comparables (les deux classifications présentes)
function pct(n: number, total: number) {
  return total === 0 ? '—' : `${Math.round((n / total) * 100)} %`
}

const tiles = computed(() => {
  const g = comparison.value?.global
  if (!g) return []
  return [
    {
      label: 'Accord exact',
      value: pct(g.accord_exact, g.compares),
      hint: `${g.accord_exact} articles aux thèmes identiques`
    },
    {
      label: 'Chevauchement',
      value: pct(g.chevauchement, g.compares),
      hint: `${g.chevauchement} articles avec ≥ 1 thème commun`
    },
    {
      label: 'Jaccard moyen',
      value: g.jaccard_moyen.toFixed(2).replace('.', ','),
      hint: 'Similarité moyenne des ensembles (0-1)'
    },
    {
      label: 'Comparés',
      value: String(g.compares),
      hint: `sur ${g.total} articles en base`
    }
  ]
})

// Désaccord total = comparables sans aucun thème commun (même définition que le filtre)
const desaccords = computed(() => {
  const g = comparison.value?.global
  return g ? g.compares - g.chevauchement : 0
})

const chartLabels = computed(() => (comparison.value?.par_theme ?? []).map(t => t.theme))
const chartDatasets = computed(() => {
  const rows = comparison.value?.par_theme ?? []
  return [
    { label: 'Accord (les deux)', values: rows.map(t => t.accord) },
    { label: 'Mistral seul', values: rows.map(t => t.mistral_seul) },
    { label: 'ML seul', values: rows.map(t => t.ml_seul) }
  ]
})
</script>

<template>
  <div class="mx-auto w-full max-w-screen-2xl p-4 sm:p-6 space-y-6">
    <header class="space-y-1">
      <p class="font-mono text-xs text-muted">/comparaison-ml</p>
      <h1 class="text-2xl font-bold tracking-tight">Comparaison ML</h1>
      <p class="text-sm text-muted">
        Classification Mistral vs zero-shot ML (mDeBERTa, seuil 0,7) sur les articles portant les deux classifications.
      </p>
    </header>

    <UAlert
      v-if="error"
      color="error"
      variant="subtle"
      icon="i-lucide-triangle-alert"
      title="Erreur lors du chargement de la comparaison."
    />

    <template v-else>
      <!-- Tuiles de concordance globale -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <template v-if="isPending">
          <USkeleton v-for="n in 4" :key="n" class="h-28 w-full" />
        </template>
        <UCard v-for="tile in tiles" v-else :key="tile.label" :ui="{ body: 'space-y-1' }">
          <p class="text-xs uppercase tracking-wide text-muted">{{ tile.label }}</p>
          <p class="font-mono text-3xl font-bold">{{ tile.value }}</p>
          <p class="text-xs text-muted">{{ tile.hint }}</p>
        </UCard>
      </div>

      <!-- Accord / désaccord par thème -->
      <UCard :ui="{ body: 'space-y-4' }">
        <template #header>
          <div class="flex items-center justify-between gap-4">
            <h2 class="font-semibold">Accord et désaccord par thème</h2>
            <UButton
              v-if="desaccords > 0"
              :label="`Voir les ${desaccords} articles en désaccord`"
              color="neutral"
              variant="subtle"
              icon="i-lucide-git-compare"
              size="sm"
              to="/?desaccord=1"
            />
          </div>
        </template>

        <USkeleton v-if="isPending" class="h-72 w-full" />
        <p v-else-if="!chartLabels.length" class="py-16 text-center text-muted">Aucune donnée.</p>
        <ClientOnly v-else>
          <ChartsBarGrouped :labels="chartLabels" :datasets="chartDatasets" />
          <template #fallback>
            <USkeleton class="h-72 w-full" />
          </template>
        </ClientOnly>
      </UCard>
    </template>
  </div>
</template>
