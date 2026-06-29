<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

// Distribution active (B2) ; Tendances arrive en B3 (désactivée pour l'instant).
const items: NavigationMenuItem[][] = [
  [
    { label: 'Articles', icon: 'i-lucide-newspaper', to: '/' }
  ],
  [
    { label: 'STATISTIQUES', type: 'label' },
    { label: 'Distribution', icon: 'i-lucide-chart-pie', to: '/distribution' },
    { label: 'Tendances', icon: 'i-lucide-trending-up', disabled: true }
  ]
]
</script>

<template>
  <UDashboardGroup>
    <UDashboardSidebar collapsible resizable :ui="{ footer: 'border-t border-default' }">
      <template #header>
        <NuxtLink to="/" class="flex items-center gap-2.5 px-1 py-1">
          <span class="size-6 rounded-md bg-primary shrink-0" />
          <span class="text-lg font-bold tracking-tight">Veille<span class="text-primary">.dev</span></span>
        </NuxtLink>
      </template>

      <template #default>
        <UNavigationMenu :items="items" orientation="vertical" />
      </template>

      <template #footer>
        <div class="flex items-center gap-2.5 w-full">
          <UAvatar icon="i-lucide-user" size="sm" />
          <div class="min-w-0">
            <p class="text-sm font-medium leading-tight">Compte</p>
            <p class="font-mono text-xs text-muted truncate">veille@dev</p>
          </div>
        </div>
      </template>
    </UDashboardSidebar>

    <main class="flex-1 min-w-0 overflow-y-auto bg-muted">
      <!-- barre mobile : ouvre la sidebar en slideover -->
      <div class="lg:hidden flex items-center gap-2 h-14 px-4 border-b border-default bg-default">
        <UDashboardSidebarToggle />
        <span class="text-base font-bold tracking-tight">Veille<span class="text-primary">.dev</span></span>
      </div>
      <slot />
    </main>
  </UDashboardGroup>
</template>
