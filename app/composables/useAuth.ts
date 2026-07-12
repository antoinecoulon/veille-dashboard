import { createAuthClient } from 'better-auth/vue'

// Client Better Auth, créé une seule fois (singleton au niveau module) : il tape same-origin
// sur /api/auth (notre handler Nitro), donc aucune option de baseURL n'est nécessaire.
// Expose la session réactive (useSession) et les actions signIn/signOut.
const authClient = createAuthClient()

export const useAuth = () => authClient
