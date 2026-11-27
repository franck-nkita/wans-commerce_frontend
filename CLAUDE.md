# CLAUDE.md — Wans Commerce Frontend

Ce fichier définit les règles que Claude doit suivre sur ce dépôt. Il prime sur les comportements par défaut.

Stack : React 19, React Router 7, Vite 7, TypeScript, Tailwind 4, Vitest.
Dépôt distant : `origin` → GitHub `franck-nkita/wans-commerce_frontend`, branche principale `main`.

---

## 1. Versionnement avec Git

- Tout changement passe par Git : pas de modification hors suivi, pas de copie manuelle de fichiers entre versions.
- Avant de commencer une tâche : `git status` et `git branch --show-current` pour connaître l'état de départ.
- Avant de créer une branche : se placer sur `main` à jour (`git switch main` puis `git pull --ff-only`).
  Le `pull` ne fait qu'avancer `main` ; s'il échoue (divergence), s'arrêter et demander.

## 2. Une branche par fonctionnalité ou correction

- Chaque tâche (fonctionnalité, correction, refactor, doc) a **sa propre branche**, créée depuis `main`.
- Une branche = un sujet. Ne pas mélanger plusieurs sujets sans rapport dans la même branche.
- Créer une branche locale ne demande pas d'autorisation ; la publier sur GitHub, si (voir §8).

## 3. Jamais de développement direct sur `main`

- Aucun commit sur `main`. Si la branche courante est `main` au moment de modifier du code, créer d'abord une branche.
- `main` n'évolue que par fusion de Pull Requests validées par le propriétaire du dépôt.
- Si des modifications ont été faites par erreur sur `main` sans commit : les déplacer sur une nouvelle branche (`git switch -c <branche>`), sans rien perdre.

## 4. Nommage des branches

Format : `<type>/<description-courte-en-kebab-case>` (minuscules, tirets, sans accents ni espaces).

| Préfixe      | Usage                                                   | Exemple                         |
|--------------|---------------------------------------------------------|---------------------------------|
| `feature/`   | Nouvelle fonctionnalité                                 | `feature/export-stock-csv`      |
| `fix/`       | Correction de bug                                       | `fix/alerte-seuil-negatif`      |
| `refactor/`  | Restructuration sans changement de comportement         | `refactor/hooks-analytics`      |
| `docs/`      | Documentation uniquement                                | `docs/git-workflow`             |

Préfixes complémentaires tolérés si besoin : `test/`, `chore/` (dépendances, configuration, outillage).

## 5. Commits structurés et explicites

Format inspiré de Conventional Commits :

```
<type>(<portée optionnelle>): <résumé à l'impératif, ≤ 72 caractères>

<corps optionnel : le pourquoi du changement, ce qui n'est pas évident>
```

- Types : `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `style`, `perf`.
- Exemples : `feat(stock): ajouter l'export CSV des mouvements`, `fix(alertes): ignorer les seuils négatifs`.
- Un commit = une modification cohérente. Pas de commit fourre-tout (« wip », « modifs »).
- Ajouter les fichiers explicitement (`git add <fichiers>`) plutôt que `git add .` / `git add -A`, pour ne pas embarquer de fichiers non voulus.
- Ne jamais committer de secrets ni de fichiers générés : `.env`, `node_modules/`, `dist/`, clés, jetons. Seul `.env.example` (sans valeurs sensibles) est versionné.
- Ne jamais contourner les hooks (`--no-verify`) ni la signature sans autorisation.

## 6. Vérifications avant chaque commit

Avant tout commit, dans cet ordre :

1. **Relire les changements** : `git status` et `git diff` (puis `git diff --staged` après l'ajout). Vérifier qu'aucun fichier inattendu ni secret n'est inclus.
2. **Vérifier les types** : `npm run typecheck`
3. **Exécuter les tests** : `npm test`
4. **Vérifier le build** si le changement touche la configuration, le routage ou les dépendances : `npm run build`

- Si une vérification échoue : ne pas committer. Corriger, ou signaler l'échec avec la sortie exacte et demander comment procéder.
- Ne jamais annoncer « tests OK » sans les avoir réellement exécutés.
- Pour un changement uniquement documentaire (`docs/`), l'étape 1 suffit ; le préciser dans le compte rendu.

## 7. Utilisation de GitHub CLI (`gh`)

Claude peut utiliser `gh` (déjà authentifié sur ce poste) pour :

- **Consulter** (sans autorisation préalable) : `gh repo view`, `gh pr list`, `gh pr view`, `gh pr checks`, `gh pr diff`, `gh issue list`, `gh issue view`, `gh run list`, `gh run view`.
- **Avec autorisation explicite** (voir §8) :
  - publier une branche : `git push -u origin <branche>` ;
  - créer une Pull Request : `gh pr create --base main --head <branche>` ;
  - commenter une PR ou une issue.

Contenu attendu d'une Pull Request :

- Titre au même format que les commits.
- Description : objectif, changements principaux, vérifications effectuées (typecheck, tests, build) et leur résultat, points d'attention pour la relecture.
- Base : `main`. Ouverte en brouillon (`--draft`) si le travail n'est pas terminé.

## 8. Opérations distantes : autorisation explicite obligatoire

Claude ne fait **jamais** les opérations suivantes sans un accord explicite de ma part, donné pour cette opération précise :

- `git push` (y compris la première publication d'une branche) ;
- fusion d'une branche ou d'une Pull Request (`git merge` vers `main`, `gh pr merge`) ;
- suppression d'une branche distante (`git push origin --delete`, `gh pr merge --delete-branch`, suppression via l'interface) ;
- fermeture d'une PR ou d'une issue, modification des paramètres du dépôt.

Un accord donné pour une opération ne vaut pas pour les suivantes : « pousse cette branche » n'autorise ni la fusion ni un autre push plus tard.

## 9. Historique protégé : pas de réécriture ni de force push

Interdit sans mon autorisation explicite :

- `git push --force` et `git push --force-with-lease` ;
- `git reset --hard`, `git rebase` sur une branche déjà publiée, `git commit --amend` d'un commit déjà poussé ;
- `git filter-branch`, `git filter-repo`, suppression de tags ;
- `git clean -fd`, `git checkout -- .` / `git restore .` sur des modifications non committées (perte de travail).

Préférer toujours une alternative non destructive : nouveau commit correctif, `git revert`, `git stash`, nouvelle branche.
`main` ne doit jamais être réécrite.

## 10. Opérations risquées : expliquer puis demander confirmation

Avant toute opération risquée ou difficile à annuler (celles des §8 et §9, mais aussi résolution de conflits, changements massifs, suppression de fichiers suivis, modification du `.gitignore` qui retire des fichiers de l'index), Claude doit :

1. **Expliquer** ce qui va être fait : commandes exactes, branches et fichiers concernés.
2. **Indiquer les conséquences** et la façon d'annuler si c'est possible.
3. **Demander confirmation** et attendre ma réponse avant d'exécuter.

En cas de doute sur le caractère risqué d'une opération, la considérer comme risquée.

---

## Cycle de travail type

```bash
git switch main && git pull --ff-only          # partir d'un main à jour
git switch -c feature/ma-fonctionnalite         # branche dédiée
# ... développement ...
git status && git diff                          # relecture
npm run typecheck && npm test                   # vérifications
git add <fichiers> && git commit                # commit structuré
# --- à partir d'ici : autorisation explicite requise ---
git push -u origin feature/ma-fonctionnalite
gh pr create --base main --fill
# la fusion est faite par le propriétaire du dépôt, ou par Claude sur demande explicite
```
