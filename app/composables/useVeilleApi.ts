export const useVeilleApi = createUseFetch({
  onRequest ({ options }) {
    const config = useRuntimeConfig()
    options.baseURL = `${config.public.workerBaseUrl}/api`
  }
})