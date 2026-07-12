import { betterAuth } from 'better-auth'
import { DatabaseSync } from 'node:sqlite'

// Config UNIQUEMENT destinée à `@better-auth/cli generate`.
// La CLI ne peut pas accéder au binding D1 (disponible seulement à l'exécution sous Cloudflare),
// on génère donc le SQL des tables contre une SQLite en mémoire (node:sqlite, intégré à Node).
// Le DDL SQLite produit est directement applicable à la D1 `veille-auth`.
// Les options doivent refléter server/utils/auth.ts (mêmes tables générées).
export const auth = betterAuth({
  database: new DatabaseSync(':memory:'),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true
  },
  // Doit refléter server/utils/auth.ts : storage 'database' ajoute la table `rateLimit`
  // au schéma généré (cf. migrations/0002_rate_limit.sql).
  rateLimit: {
    enabled: true,
    storage: 'database'
  }
})
