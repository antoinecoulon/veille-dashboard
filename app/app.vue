<script setup lang="ts">
const {
  data: response,
  status,
  error
} = await useVeilleApi<PaginatedApiResponse<Article[]>>('/articles')
</script>


<template>
  <div v-if="error">
    Erreur: {{ error.message }}
  </div>
  
  <div v-if="status === 'pending'">
    Loading...
  </div>
  
  <div v-else v-for="article in response?.data" :key="article.id">
    {{ article.titre }}
  </div>
</template>
