// Appels same-origin vers /api : des routes serveur Nitro (server/api/*) vérifient d'abord
// la session, puis proxifient vers le Worker analytics. Pas de CORS, URL du Worker côté serveur.
//
// `server: false` → fetch **côté client uniquement**. L'authentification est client-only
// (cf. middleware/auth.global.ts qui `return` sur le serveur) : la session n'est établie qu'au
// runtime navigateur. Un fetch SSR partirait donc sans cookie de session → 401. En client-only,
// la requête XHR same-origin porte automatiquement le cookie et la donnée charge correctement.
export const useVeilleApi = createUseFetch({
  baseURL: '/api',
  server: false
})
