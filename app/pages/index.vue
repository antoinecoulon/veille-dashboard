<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui';

const UButton = resolveComponent('UButton')

const { data: response, error, status } = useVeilleApi<PaginatedApiResponse<Article[]>>('/articles')

const articles = ref<Article[] | undefined>(response.value?.data)

const columns = ref<TableColumn<Article>[]>([
  {
    accessorKey: 'id',
    header: 'ID'
  },
  {
    accessorKey: 'titre',
    header: 'Titre'
  },
  {
    accessorKey: 'url',
    header: 'URL',
    cell: ({ row }) => {
      const url = row.original.url
      return h(UButton, {
        label: 'Voir',
        onClick: () => navigateTo(url, { external: true }),
        leadingIcon: 'i-lucide-link',
        size: 'xs',
        class: 'hover:cursor-pointer'
      })
    }
  },
  {
    accessorKey: 'resume',
    header: 'Résumé'
  },
  {
    accessorKey: 'source',
    header: 'Source'
  },
  {
    accessorKey: 'categorie_mistral',
    header: 'Catégorie Mistral'
  },
  {
    accessorKey: 'score_mistral',
    header: 'Score Mistral'
  },
  {
    accessorKey: 'themes_mistral',
    header: 'Themes Mistral'
  },
  {
    accessorKey: 'themes_ml',
    header: 'Themes ML'
  },
  {
    accessorKey: 'score_confiance_ml',
    header: 'Score Confiance ML'
  },
  {
    accessorKey: 'tags',
    header: 'Tags'
  },
  {
    accessorKey: 'date_article',
    header: 'Date Article'
  },
  {
    accessorKey: 'date_collecte',
    header: 'Date Collecte'
  },
])
</script>


<template>
  <div v-if="error">
    <p>Erreur lors du chargement des données.</p>
  </div>
  <UTable
    :data="articles"
    :columns="columns"
    :loading="status === 'pending' || articles?.length === 0"
    class="w-full"
  >
  </UTable>
</template>