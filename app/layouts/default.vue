<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const items: NavigationMenuItem[][] = [
  [
    { label: 'Articles', icon: 'i-lucide-newspaper', to: '/' }
  ],
  [
    { label: 'STATISTIQUES', type: 'label' },
    { label: 'Distribution', icon: 'i-lucide-chart-pie', to: '/distribution' },
    { label: 'Tendances', icon: 'i-lucide-trending-up', to: '/tendances' },
    { label: 'Comparaison ML', icon: 'i-lucide-git-compare', to: '/comparaison-ml' }
  ],
  [
    // La santé du pipeline n'est pas une statistique de veille : c'est de l'exploitation.
    { label: 'EXPLOITATION', type: 'label' },
    { label: 'Santé', icon: 'i-lucide-activity', to: '/sante' }
  ]
]

// Session réactive (Better Auth) : alimente l'affichage utilisateur du footer.
const authClient = useAuth()
const session = authClient.useSession()

async function logout() {
  await authClient.signOut()
  await navigateTo('/login')
}
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
        <!-- ClientOnly : la session s'hydrate côté client (data null au SSR) -->
        <ClientOnly>
          <div v-if="session.data" class="flex items-center gap-2.5 w-full">
            <UAvatar icon="i-lucide-user" size="sm" />
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium leading-tight truncate">{{ session.data.user.name || 'Admin' }}</p>
              <p class="font-mono text-xs text-muted truncate">{{ session.data.user.email }}</p>
            </div>
            <UButton
              icon="i-lucide-log-out"
              color="neutral"
              variant="ghost"
              size="sm"
              aria-label="Se déconnecter"
              @click="logout"
            />
          </div>
          <UButton
            v-else
            to="/login"
            icon="i-lucide-log-in"
            color="neutral"
            variant="subtle"
            label="Se connecter"
            block
          />
        </ClientOnly>
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
