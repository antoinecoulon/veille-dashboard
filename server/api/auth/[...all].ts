// Route attrape-tout : toutes les requêtes /api/auth/** sont déléguées au handler Better Auth.
// serverAuth(event) reconstruit l'instance avec le binding D1 de la requête (auto-importé
// depuis server/utils/auth.ts).
export default defineEventHandler((event) => {
  return serverAuth(event).handler(toWebRequest(event))
})
