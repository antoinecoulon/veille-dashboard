<script setup lang="ts">
import { Bar } from 'vue-chartjs'
import type { ChartData, ChartOptions } from 'chart.js'
import './register'

const props = defineProps<{
  labels: string[]
  values: number[]
}>()

const chartData = computed<ChartData<'bar'>>(() => ({
  labels: props.labels,
  datasets: [
    {
      data: props.values,
      backgroundColor: '#10b981',
      borderRadius: 4
    }
  ]
}))

// indexAxis: 'y' → barres horizontales (libellés de sources souvent longs et nombreux).
const options: ChartOptions<'bar'> = {
  indexAxis: 'y',
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: { beginAtZero: true, ticks: { precision: 0 } }
  }
}
</script>

<template>
  <div class="h-72">
    <Bar :data="chartData" :options="options" />
  </div>
</template>
