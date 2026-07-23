import { describe, expect, it } from 'vitest'
import reponseWorker from './fixtures/health.worker.json'
import type { PipelineHealth } from '../shared/types/stats'

// Test de contrat entre deux dépôts — la dette qui a produit le défaut consigné en ADR D18.
//
// `GET /api/stats/health` traverse une frontière que rien ne surveille : le Worker
// (veille-analytics) produit le JSON, le dashboard le retype À LA MAIN dans
// shared/types/stats.ts. Aucun outil ne relie les deux. Quand l'ADR D12 a renommé
// `derniere_ingestion` en `dernier_article_collecte`, le Worker a suivi, pas le dashboard :
// `sante.vue` lisait un champ inexistant, `formatDate` recevait `undefined` et affichait un
// tiret. La page répondait 200 et paraissait saine — c'est ce qui a permis au défaut de tenir.
//
// C'est exactement la classe de panne que le générateur C#→TypeScript supprime chez BRIAND en
// dérivant les types du contrat au lieu de les recopier. Ici, faute de générateur, le filet
// est ce test.
//
// TRIANGULATION — trois affirmations indépendantes, qui ne peuvent pas dériver ensemble :
//   1. la fixture est une réponse RÉELLE du Worker (à recapturer si le Worker change) ;
//   2. CHEMINS_ATTENDUS transcrit le contrat côté producteur (veille-analytics/src/lib/health.ts,
//      interface PipelineHealth, et docs/003-api.md §7) ;
//   3. `satisfies` lie la fixture au type consommé par les pages, contrôlé par `pnpm typecheck`.
// Modifier une seule des trois fait tomber la vérification. Les modifier toutes les trois est
// un renommage délibéré, ce qui est le comportement voulu.

// Contrat côté PRODUCTEUR. Recopié depuis src/lib/health.ts du dépôt veille-analytics
// (interface PipelineHealth) ; toute évolution y commence et se répercute ici.
const CHEMINS_ATTENDUS = [
  'statut',
  'collecte.dernier_article_collecte',
  'collecte.jours_depuis',
  'collecte.statut',
  'classification.total',
  'classification.ml_en_retard',
  'classification.ml_sans_theme',
  'classification.mistral_manquants',
  'classification.statut'
]

// Liaison de TYPE, contrôlée par `pnpm typecheck` et non par vitest.
//
// Chaque champ est nommé des deux côtés : à gauche celui qu'attend le dashboard, à droite
// celui que porte la réponse du Worker. Renommer l'un sans l'autre casse la compilation —
// propriété qui manquait le jour du renommage de l'ADR D12. Les statuts sont écrits en clair
// parce qu'un import JSON élargit `"ok"` en `string`, ce qui rendrait le contrôle inopérant
// sur l'union `StatutSante`.
const LIAISON: PipelineHealth = {
  statut: 'ok',
  collecte: {
    dernier_article_collecte: reponseWorker.data.collecte.dernier_article_collecte,
    jours_depuis: reponseWorker.data.collecte.jours_depuis,
    statut: 'ok'
  },
  classification: {
    total: reponseWorker.data.classification.total,
    ml_en_retard: reponseWorker.data.classification.ml_en_retard,
    ml_sans_theme: reponseWorker.data.classification.ml_sans_theme,
    mistral_manquants: reponseWorker.data.classification.mistral_manquants,
    statut: 'ok'
  }
}

/** Chemins pointés d'un objet, triés — comparables d'une implémentation à l'autre. */
function cheminsDe(valeur: unknown, prefixe = ''): string[] {
  if (valeur === null || typeof valeur !== 'object' || Array.isArray(valeur)) {
    return [prefixe]
  }
  return Object.entries(valeur as Record<string, unknown>)
    .flatMap(([cle, v]) => cheminsDe(v, prefixe ? `${prefixe}.${cle}` : cle))
    .sort()
}

describe('Contrat GET /api/stats/health entre le Worker et le dashboard', () => {
  it('la réponse du Worker porte exactement les champs attendus par le dashboard', () => {
    expect(cheminsDe(reponseWorker.data)).toEqual([...CHEMINS_ATTENDUS].sort())
  })

  it('la fixture reste assignable au type consommé par les pages', () => {
    // Le contrôle utile de LIAISON est fait par `pnpm typecheck` à la compilation ; cette
    // assertion ne fait que garantir que la constante reste référencée et cohérente.
    expect(LIAISON.collecte.dernier_article_collecte)
      .toBe(reponseWorker.data.collecte.dernier_article_collecte)
  })

  it('le champ de fraîcheur est celui que le Worker émet, pas l’ancien nom', () => {
    // Non-régression nommée : c'est CE renommage (ADR D12) qui a été manqué. Le nom précédent
    // affirmait une dernière passe de collecte là où la mesure ne date qu'un dernier article
    // inséré — une passe qui ne ramène que des doublons n'écrit rien.
    const collecte = reponseWorker.data.collecte
    expect(collecte).toHaveProperty('dernier_article_collecte')
    expect(collecte).not.toHaveProperty('derniere_ingestion')
    expect(collecte.dernier_article_collecte).toBeTypeOf('string')
  })

  it('les trois statuts possibles sont ceux que le dashboard sait présenter', () => {
    // sante.vue indexe STATUTS par le statut reçu : une quatrième valeur produirait un accès
    // undefined et une page cassée, sans erreur explicite.
    const sante = reponseWorker.data
    for (const statut of [sante.statut, sante.collecte.statut, sante.classification.statut]) {
      expect(['ok', 'degrade', 'alerte']).toContain(statut)
    }
  })
})
