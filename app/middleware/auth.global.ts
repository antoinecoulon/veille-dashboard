export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path === '/login') return
  if (import.meta.server) return

  const { data } = await useAuth().getSession()
  if (!data) return navigateTo('/login')
})
