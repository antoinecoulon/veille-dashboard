<script setup lang="ts">
const { data: response, status, error } = useVeilleApi<ApiResponse<PipelineHealth>>('/stats/health')

const sante = computed(() => response.value?.data)
const isPending = computed(() => status.value === 'pending')

// Présentation des trois statuts. Les seuils eux-mêmes vivent côté Worker
// (src/lib/health.ts) : la page ne juge rien, elle affiche un verdict déjà rendu.
const STATUTS: Record<StatutSante, { label: string, color: 'success' | 'warning' | 'error', icon: string }> = {
  ok: { label: 'Nominal', color: 'success', icon: 'i-lucide-circle-check' },
  degrade: { label: 'Dégradé', color: 'warning', icon: 'i-lucide-circle-alert' },
  alerte: { label: 'Alerte', color: 'error', icon: 'i-lucide-triangle-alert' }
}

const global = computed(() => STATUTS[sante.value?.statut ?? 'ok'])

const messageGlobal = computed(() => {
  switch (sante.value?.statut) {
    case 'alerte': return 'Le pipeline demande une intervention.'
    case 'degrade': return 'La collecte a pris du retard sur son rythme de référence.'
    default: return 'Collecte à jour et classification complète.'
  }
})

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' })
}

const fraicheur = computed(() => {
  const j = sante.value?.collecte.jours_depuis
  if (j === null || j === undefined) return 'Aucune ingestion'
  if (j === 0) return "Aujourd'hui"
  return j === 1 ? 'Il y a 1 jour' : `Il y a ${j} jours`
})

// Compteurs de classification. `alerte` distingue le seul compteur qui pilote un statut
// des deux autres, exposés mais neutres — cf. ADR D12.
const compteurs = computed(() => {
  const c = sante.value?.classification
  if (!c) return []
  return [
    {
      label: 'Articles',
      value: c.total,
      hint: 'total en base',
      alerte: false
    },
    {
      label: 'ML en retard',
      value: c.ml_en_retard,
      hint: 'non classifiés > 24 h après la collecte',
      alerte: c.ml_en_retard > 0
    },
    {
      label: 'ML sans thème',
      value: c.ml_sans_theme,
      hint: 'classifiés, rien au-dessus du seuil 0,7 — pas un échec',
      alerte: false
    },
    {
      label: 'Sans thème Mistral',
      value: c.mistral_manquants,
      hint: 'résidu de la migration initiale — pas un échec',
      alerte: false
    }
  ]
})
</script>

<template>
  <div class="mx-auto w-full max-w-screen-2xl p-4 sm:p-6 space-y-6">
    <header class="space-y-1">
      <p class="font-mono text-xs text-muted">/sante</p>
      <h1 class="text-2xl font-bold tracking-tight">Santé du pipeline</h1>
      <p class="text-sm text-muted">
        Fraîcheur de la collecte et état de la classification. Sans cet écran, un échec de
        classification et une collecte interrompue sont tous deux silencieux.
      </p>
    </header>

    <UAlert
      v-if="error"
      color="error"
      variant="subtle"
      icon="i-lucide-triangle-alert"
      title="Erreur lors du chargement de l'état du pipeline."
    />

    <template v-else>
      <USkeleton v-if="isPending" class="h-20 w-full" />
      <UAlert
        v-else
        :color="global.color"
        :icon="global.icon"
        variant="subtle"
        :title="global.label"
        :description="messageGlobal"
      />

      <div class="grid gap-4 lg:grid-cols-2">
        <!-- Collecte -->
        <UCard :ui="{ body: 'space-y-4' }">
          <template #header>
            <div class="flex items-center justify-between gap-4">
              <h2 class="font-semibold">Collecte</h2>
              <UBadge
                v-if="sante"
                :color="STATUTS[sante.collecte.statut].color"
                variant="subtle"
                :label="STATUTS[sante.collecte.statut].label"
              />
            </div>
          </template>

          <USkeleton v-if="isPending" class="h-24 w-full" />
          <template v-else-if="sante">
            <div class="space-y-1">
              <p class="text-xs uppercase tracking-wide text-muted">Dernière ingestion</p>
              <p class="font-mono text-3xl font-bold">{{ fraicheur }}</p>
              <p class="text-xs text-muted">{{ formatDate(sante.collecte.derniere_ingestion) }}</p>
            </div>
            <p class="text-xs text-muted">
              Seuils : nominal jusqu'à 3 jours, dégradé de 4 à 14, alerte au-delà. Calibrés sur le
              meilleur rythme réellement tenu par le projet, pas sur son rythme moyen —
              le déclenchement de la collecte est resté manuel.
            </p>
          </template>
        </UCard>

        <!-- Classification -->
        <UCard :ui="{ body: 'space-y-4' }">
          <template #header>
            <div class="flex items-center justify-between gap-4">
              <h2 class="font-semibold">Classification</h2>
              <UBadge
                v-if="sante"
                :color="STATUTS[sante.classification.statut].color"
                variant="subtle"
                :label="STATUTS[sante.classification.statut].label"
              />
            </div>
          </template>

          <USkeleton v-if="isPending" class="h-24 w-full" />
          <div v-else class="grid grid-cols-2 gap-3">
            <div v-for="c in compteurs" :key="c.label" class="space-y-1">
              <p class="text-xs uppercase tracking-wide text-muted">{{ c.label }}</p>
              <p class="font-mono text-2xl font-bold" :class="c.alerte ? 'text-error' : ''">
                {{ c.value }}
              </p>
              <p class="text-xs text-muted">{{ c.hint }}</p>
            </div>
          </div>
        </UCard>
      </div>

      <p class="text-xs text-muted">
        Cet écran <em>détecte</em>, il n'historise pas : faute de journal, les échecs déjà rattrapés
        (backfill du 18 juillet 2026, 503/503) n'y apparaissent pas.
      </p>
    </template>
  </div>
</template>
