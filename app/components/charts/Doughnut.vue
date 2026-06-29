<script setup lang="ts">
import { Doughnut } from 'vue-chartjs'
import type { ChartData, ChartOptions } from 'chart.js'
import './register'

const props = defineProps<{
  labels: string[]
  values: number[]
}>()

// Palette catégorielle : teintes franchement distinctes (emerald en tête, charte oblige),
// pour différencier les 7 thèmes au coup d'œil.
const PALETTE = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#ec4899', '#64748b']

// computed : reconstruit la structure attendue par Chart.js à chaque changement de props.
const chartData = computed<ChartData<'doughnut'>>(() => ({
  labels: props.labels,
  datasets: [
    {
      data: props.values,
      backgroundColor: props.labels.map((_, i) => PALETTE[i % PALETTE.length]),
      borderWidth: 2,
      borderColor: '#ffffff'
    }
  ]
}))

const options: ChartOptions<'doughnut'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'bottom', labels: { font: { family: 'Space Grotesk' } } }
  }
}
</script>

<template>
  <div class="h-72">
    <Doughnut :data="chartData" :options="options" />
  </div>
</template>
