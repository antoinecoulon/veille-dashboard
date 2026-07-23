import { defineConfig } from 'vitest/config'

// Vitest « nu », sans environnement Nuxt : ces tests portent sur des modules qui n'importent
// ni h3, ni Nuxt, ni Better Auth (server/utils/relais.ts) et sur des types partagés. Monter le
// runtime Nuxt exigerait un build de l'application à chaque exécution, pour ne rien couvrir de
// plus — le découplage a justement été fait pour éviter ce coût.
//
// Ce que cette configuration NE couvre donc pas, et qu'il faut savoir : le rendu des pages, les
// routes Nitro assemblées et la session Better Auth réelle. Ces trois-là restent vérifiés par
// `pnpm typecheck`, le scan ZAP du workflow security-scan.yml et le relevé manuel documenté
// dans le README. La suite d'intégration sur vraie D1 émulée vit dans le dépôt veille-analytics.
export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node'
  }
})
