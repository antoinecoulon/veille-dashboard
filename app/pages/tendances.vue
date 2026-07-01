<script setup lang="ts">
const { data: timelineResp, status: timelineStatus, error: timelineError }
  = useVeilleApi<ApiResponse<TimelineStat[]>>('/stats/timeline')

// On transforme la réponse API { data: [{ jour, count }] } en deux tableaux parallèles
// labels / values, format direct consommé par notre composant graphe.
const labels = computed(() => (timelineResp.value?.data ?? []).map(t => t.jour))
const values = computed(() => (timelineResp.value?.data ?? []).map(t => t.count))

const pending = computed(() => timelineStatus.value === 'pending')
</script>

<template>
  <div class="mx-auto w-full max-w-screen-2xl p-4 sm:p-6 space-y-6">
    <header class="space-y-1">
      <p class="font-mono text-xs text-muted">/tendances</p>
      <h1 class="text-2xl font-bold tracking-tight">Tendances</h1>
    </header>

    <UCard :ui="{ body: 'space-y-4' }">
      <template #header>
        <h2 class="font-semibold">Volume d'articles par jour</h2>
      </template>

      <UAlert
        v-if="timelineError"
        color="error"
        variant="subtle"
        icon="i-lucide-triangle-alert"
        title="Erreur lors du chargement de la timeline."
      />
      <USkeleton v-else-if="pending" class="h-72 w-full" />
      <p v-else-if="!labels.length" class="py-16 text-center text-muted">Aucune donnée.</p>
      <ClientOnly v-else>
        <ChartsLine :labels="labels" :values="values" />
        <template #fallback>
          <USkeleton class="h-72 w-full" />
        </template>
      </ClientOnly>
    </UCard>
  </div>
</template>
