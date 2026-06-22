# Guide de collaboration

## Expliquer chaque modification

Pour chaque changement de code, expliquer :
- **Pourquoi** cette approche a été choisie
- **Quel concept ou syntaxe** est mis en jeu (ex : composable Vue, type générique TypeScript, slot Nuxt UI, etc.)
- **Ce que ça change concrètement** dans le comportement

Niveau d'explication adapté à un développeur qui apprend : ne pas supposer que la syntaxe est connue, mais ne pas non plus surexpliquer ce qui est évident.

## Avant de modifier : vérifier sa certitude

Si le résultat d'une modification n'est pas certain (comportement inattendu possible, API mal connue, interaction entre composants floue), **le signaler explicitement** avant d'agir :

> "Je ne suis pas certain de X — je vérifie d'abord avant de modifier."

Ensuite lire le code concerné, consulter les types, ou explorer les fichiers liés. Chercher la documentation en ligne jusqu'à être sûr. Ne jamais modifier à l'aveugle.

## Toujours aller au plus simple en premier

Face à plusieurs options, commencer par la plus simple qui résout le problème. Ne pas introduire d'abstraction, de helper ou de pattern avancé si une solution directe suffit. Proposer une alternative plus élaborée seulement si la solution simple atteint une limite concrète.

## Commentaires

N'ajoute des commentaires que si c'est vraiment nécessaire. Respecter la règle "un code bien nommé est un code bien documenté".