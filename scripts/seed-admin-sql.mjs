// Génère le SQL d'insertion d'un compte admin Better Auth (email + password).
// Le hash scrypt est produit par Better Auth lui-même (better-auth/crypto), donc
// il sera vérifiable tel quel par le worker en prod (le hash est autonome, il ne
// dépend pas du secret de session). À exécuter depuis la racine du projet pour que
// `better-auth/crypto` se résolve depuis node_modules.
//
//   SEED_ADMIN_EMAIL=... SEED_ADMIN_PASSWORD=... node <ce-fichier> > seed.sql
//
import { hashPassword, verifyPassword } from 'better-auth/crypto'
import { randomUUID } from 'node:crypto'

const email = process.env.SEED_ADMIN_EMAIL
const password = process.env.SEED_ADMIN_PASSWORD
const name = process.env.SEED_ADMIN_NAME || 'Admin'

if (!email || !password) {
  console.error('Erreur : SEED_ADMIN_EMAIL et SEED_ADMIN_PASSWORD requis dans l\'environnement.')
  process.exit(1)
}

const now = new Date().toISOString()
const userId = randomUUID()
const accountId = randomUUID()

const hash = await hashPassword(password)

// Garde-fou : Better Auth doit pouvoir re-vérifier son propre hash avant qu'on l'insère.
if (!(await verifyPassword({ hash, password }))) {
  console.error('Erreur : auto-vérification du hash échouée — abandon.')
  process.exit(1)
}

const q = (s) => `'${String(s).replace(/'/g, "''")}'`

// account.accountId = user.id et providerId = 'credential' : conventions Better Auth
// pour un compte email/mot de passe (cf. revoke-unproven-account-access : providerId === 'credential').
process.stdout.write(
  `INSERT INTO "user" ("id","name","email","emailVerified","image","createdAt","updatedAt") ` +
  `VALUES (${q(userId)},${q(name)},${q(email)},0,NULL,${q(now)},${q(now)});\n` +
  `INSERT INTO "account" ("id","accountId","providerId","userId","password","createdAt","updatedAt") ` +
  `VALUES (${q(accountId)},${q(userId)},'credential',${q(userId)},${q(hash)},${q(now)},${q(now)});\n`
)
