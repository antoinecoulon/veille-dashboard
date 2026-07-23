import { describe, expect, it } from 'vitest'
import { ErreurRelais, preparerRelais } from '../server/utils/relais'

// Ce que ces tests couvrent : le chemin par lequel passe toute donnée d'article servie à un
// utilisateur. L'ADR D15 affirme que « protéger l'UI ne suffit pas, il faut protéger la
// donnée » et que le refus est l'état par défaut en cas de panne — jusqu'ici aucune de ces
// deux affirmations n'était vérifiée par autre chose qu'une relecture.

const CONFIG_VIDE = {}
const CONFIG_DEV = { workerBaseUrl: 'http://localhost:8787', workerReadToken: 'jeton-dev' }
const ENV_PROD = {
  NUXT_WORKER_BASE_URL: 'https://worker.exemple',
  NUXT_WORKER_READ_TOKEN: 'jeton-prod'
}

// Une session Better Auth est un objet ; seule sa présence compte ici, l'autorisation par
// utilisateur n'a pas d'objet sur ce corpus (toute session voit les mêmes articles).
const SESSION = { user: { id: 'u1' } }

describe('Refus par défaut', () => {
  it.each([
    ['null', null],
    ['undefined', undefined]
  ])('refuse en 401 quand la session est %s', (_libelle, session) => {
    expect(() => preparerRelais(session, ENV_PROD, CONFIG_DEV)).toThrow(ErreurRelais)
    expect(() => preparerRelais(session, ENV_PROD, CONFIG_DEV)).toThrow(/Unauthorized/)
  })

  it('juge la session AVANT de résoudre la configuration', () => {
    // Sans session ET sans configuration, c'est bien 401 qui sort, pas 500 : l'ordre des
    // contrôles est la propriété qui garantit qu'un refus ne part jamais en sous-requête.
    try {
      preparerRelais(null, undefined, CONFIG_VIDE)
      expect.unreachable('un refus était attendu')
    } catch (err) {
      expect(err).toBeInstanceOf(ErreurRelais)
      expect((err as ErreurRelais).statusCode).toBe(401)
    }
  })
})

describe('Une erreur de configuration ferme, elle n’ouvre pas', () => {
  it('échoue en 500 sans URL de Worker, plutôt que de relayer à une adresse vide', () => {
    try {
      preparerRelais(SESSION, undefined, { workerReadToken: 'jeton' })
      expect.unreachable('un refus était attendu')
    } catch (err) {
      expect((err as ErreurRelais).statusCode).toBe(500)
      expect((err as ErreurRelais).statusMessage).toMatch(/URL du Worker/)
    }
  })

  it('échoue en 500 sans jeton, plutôt que d’émettre une requête qui reviendra en 401', () => {
    // Le point du test : sans jeton, l'échec est ici et il est explicite. Laisser partir la
    // requête donnerait un 401 du Worker, indiscernable d'une session expirée côté écran.
    try {
      preparerRelais(SESSION, undefined, { workerBaseUrl: 'https://worker.exemple' })
      expect.unreachable('un refus était attendu')
    } catch (err) {
      expect((err as ErreurRelais).statusCode).toBe(500)
      expect((err as ErreurRelais).statusMessage).toMatch(/Jeton de lecture/)
    }
  })

  it('traite un jeton fait de blancs comme une absence, et non comme un jeton', () => {
    // `trim()` avant le test de présence : l'ordre inverse laisserait partir une chaîne vide
    // en en-tête, et le Worker répondrait 401 sans qu'on sache pourquoi.
    expect(() => preparerRelais(SESSION, undefined, { ...CONFIG_DEV, workerReadToken: '  \n' }))
      .toThrow(/Jeton de lecture/)
  })
})

describe('Résolution de la cible et du jeton', () => {
  it('relaie avec la configuration de développement quand il n’y a pas d’env Cloudflare', () => {
    expect(preparerRelais(SESSION, undefined, CONFIG_DEV)).toEqual({
      base: 'http://localhost:8787',
      token: 'jeton-dev'
    })
  })

  it('donne la priorité à l’env Cloudflare sur runtimeConfig', () => {
    // Sur le Worker, les overrides NUXT_ → runtimeConfig ne sont pas fiables au runtime :
    // c'est l'env CF qui fait foi, sans quoi la production relaierait vers localhost.
    expect(preparerRelais(SESSION, ENV_PROD, CONFIG_DEV)).toEqual({
      base: 'https://worker.exemple',
      token: 'jeton-prod'
    })
  })

  it('coupe le saut de ligne ajouté par `wrangler secret put` en mode pipe', () => {
    // Piège réellement rencontré : le Worker répondait 401 alors que la session était valide
    // et que seul l'octet de fin du secret différait.
    const { token } = preparerRelais(
      SESSION,
      { ...ENV_PROD, NUXT_WORKER_READ_TOKEN: 'jeton-prod\n' },
      CONFIG_VIDE
    )
    expect(token).toBe('jeton-prod')
  })
})
