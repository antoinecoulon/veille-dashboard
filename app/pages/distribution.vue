<script setup lang="ts">
const { data: themesResp, status: themesStatus, error: themesError }
  = useVeilleApi<ApiResponse<ThemeStat[]>>('/stats/themes')
const { data: sourcesResp, status: sourcesStatus, error: sourcesError }
  = useVeilleApi<ApiResponse<SourceStat[]>>('/stats/sources')

// On transforme la réponse API { data: [{ theme, count }] } en deux tableaux parallèles
// labels / values, format direct consommé par nos composants graphe.
const themeLabels = computed(() => (themesResp.value?.data ?? []).map(t => t.theme))
const themeValues = computed(() => (themesResp.value?.data ?? []).map(t => t.count))

const sourceLabels = computed(() => (sourcesResp.value?.data ?? []).map(s => s.source))
const sourceValues = computed(() => (sourcesResp.value?.data ?? []).map(s => s.count))

const themesPending = computed(() => themesStatus.value === 'pending')
const sourcesPending = computed(() => sourcesStatus.value === 'pending')
</script>

<template>
  <div class="mx-auto w-full max-w-screen-2xl p-4 sm:p-6 space-y-6">
    <header class="space-y-1">
      <p class="font-mono text-xs text-muted">/distribution</p>
      <h1 class="text-2xl font-bold tracking-tight">Distribution</h1>
    </header>

    <div class="grid gap-6 lg:grid-cols-2">
      <!-- Répartition par thème -->
      <UCard :ui="{ body: 'space-y-4' }">
        <template #header>
          <h2 class="font-semibold">Par thème</h2>
        </template>

        <UAlert
          v-if="themesError"
          color="error"
          variant="subtle"
          icon="i-lucide-triangle-alert"
          title="Erreur lors du chargement des thèmes."
        />
        <USkeleton v-else-if="themesPending" class="h-72 w-full" />
        <p v-else-if="!themeLabels.length" class="py-16 text-center text-muted">Aucune donnée.</p>
        <ClientOnly v-else>
          <ChartsDoughnut :labels="themeLabels" :values="themeValues" />
          <template #fallback>
            <USkeleton class="h-72 w-full" />
          </template>
        </ClientOnly>
      </UCard>

      <!-- Répartition par source -->
      <UCard :ui="{ body: 'space-y-4' }">
        <template #header>
          <h2 class="font-semibold">Par source</h2>
        </template>

        <UAlert
          v-if="sourcesError"
          color="error"
          variant="subtle"
          icon="i-lucide-triangle-alert"
          title="Erreur lors du chargement des sources."
        />
        <USkeleton v-else-if="sourcesPending" class="h-72 w-full" />
        <p v-else-if="!sourceLabels.length" class="py-16 text-center text-muted">Aucune donnée.</p>
        <ClientOnly v-else>
          <ChartsBar :labels="sourceLabels" :values="sourceValues" />
          <template #fallback>
            <USkeleton class="h-72 w-full" />
          </template>
        </ClientOnly>
      </UCard>
    </div>
  </div>
</template>
