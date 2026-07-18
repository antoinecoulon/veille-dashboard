<script setup lang="ts">
import { Bar } from 'vue-chartjs'
import type { ChartData, ChartOptions } from 'chart.js'
import './register'

const props = defineProps<{
  labels: string[]
  datasets: { label: string, values: number[] }[]
}>()

// Même palette catégorielle que Doughnut.vue, assignée dans l'ordre des séries
// (jamais par rang recalculé) : emerald pour l'accord, blue/amber pour les écarts.
const PALETTE = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#ec4899', '#64748b']

const chartData = computed<ChartData<'bar'>>(() => ({
  labels: props.labels,
  datasets: props.datasets.map((dataset, i) => ({
    label: dataset.label,
    data: dataset.values,
    backgroundColor: PALETTE[i % PALETTE.length],
    borderRadius: 4
  }))
}))

// indexAxis: 'x' → barres verticales groupées (plusieurs séries à comparer par thème).
const options: ChartOptions<'bar'> = {
  indexAxis: 'x',
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: true, position: 'bottom', labels: { font: { family: 'Space Grotesk' } } }
  },
  scales: {
    y: { beginAtZero: true, ticks: { precision: 0 } }
  }
}
</script>

<template>
  <div class="h-72">
    <Bar :data="chartData" :options="options" />
  </div>
</template>
