// Appels same-origin vers /api : Nitro proxifie vers le Worker (cf. routeRules).
// Pas de CORS, URL du Worker masquée côté serveur.
export const useVeilleApi = createUseFetch({
  baseURL: '/api'
})
