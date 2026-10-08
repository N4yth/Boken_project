# Refonte du front (branche `front-soso`)

Ce document résume ce que j'ai changé dans `boken/frontend` et pourquoi. La logique métier et les appels au back n'ont pas bougé, sauf trois bugs corrigés (voir plus bas).

## Lancer le projet

```bash
cd boken/frontend
npm ci          # lucide-react et Tailwind 3 n'étaient pas installés partout
npm run dev
```

L'adresse de l'API se règle avec la variable `NEXT_PUBLIC_API_URL`. Sans elle, le front utilise `http://127.0.0.1:8000`.

## 1. Nouvelle identité visuelle

**Ce qui change**
- Des couleurs reprises du logo : papier crème, encre marine, et un rouge vermillon façon sceau pour les accents.
- Un thème sombre (« Night »). Le logo y passe en doré.
- Les titres sont en Archivo condensé, comme les titres de webtoon. Le texte est en Geist, et les chiffres (chapitres, notes) en Geist Mono.
- Les couleurs sont des variables CSS dans `globals.css`, branchées sur Tailwind (`bg-paper`, `text-ink`, `bg-seal`...). Pour changer une couleur, on modifie une seule ligne.

**Pourquoi**
- L'ancien design mélangeait des dégradés indigo, violet et rose différents sur chaque page, sans lien avec le logo ni avec l'univers manhwa.
- Les variables évitent de répéter des couleurs en dur dans chaque composant. C'est aussi ce qui rend le thème sombre possible sans dupliquer les classes.

## 2. Couvertures générées

**Ce qui change**
Le composant `components/Cover.tsx` génère une couverture pour chaque série : une couleur, une trame demi-ton ou des lignes de vitesse façon manga, et le titre en gros. Le rendu est calculé à partir du titre, donc une série garde toujours la même couverture.

**Pourquoi**
L'API ne fournit aucune image. Avant, toutes les cartes affichaient le même « image Not Found ». Avec des couvertures distinctes, on repère une série d'un coup d'œil dans une liste.

## 3. Pages

| Route | Changement |
|---|---|
| `/` | **Nouvelle page d'accueil** : le logo en grand, les chiffres réels du catalogue, une rangée de couvertures qui défile et l'explication du site |
| `/discover` | L'ancien accueil (le catalogue), déplacé ici. Il gagne une série mise en avant et un tri Récents / Mieux notés / Titre |
| `/display_webtoon` | Fiche plus lisible : stats en tableau, synopsis aéré, liste des éditions si la série en a plusieurs |
| `/library` | Grille de couvertures, avec un bouton pour basculer entre mes notes et celles de la communauté |
| `/library/update_webtoon` | Compteur de chapitres avec boutons +1 et -1, barre de progression, et une barre « modifications non enregistrées » à la place du mode Édition |
| `/library/add_webtoon` | Formulaire découpé en sections, avec un aperçu de la couverture pendant la saisie |
| `/advanced_search` | Les résultats se mettent à jour pendant la saisie, et les filtres s'ouvrent dans un panneau en bas de l'écran sur mobile |
| `/news` | File de validation admin sous forme de liste. Un non-admin voit un message clair au lieu d'une page vide |
| `/settings` | **Nouvelle page** : choix du thème (clair, sombre ou système) et compte |

Sur desktop, la navigation est dans le header. Sur mobile, elle passe dans une barre d'onglets en bas.

**Pourquoi**
- Le catalogue ne pouvait pas servir de présentation du site à quelqu'un qui arrive pour la première fois. D'où la page d'accueil séparée.
- Sur la fiche de suivi, l'action la plus fréquente est d'ajouter un chapitre lu. Avant, il fallait passer en mode Édition, taper le nombre et enregistrer. Maintenant, c'est un clic.
- La page Settings faisait partie du sprint, mais le bouton du footer ne menait nulle part.

## 4. Code et architecture

| Fichier | Rôle |
|---|---|
| `app/lib/api.ts` | Une fonction `api()` pour tous les appels : URL de base, token JWT, gestion des erreurs |
| `app/lib/types.ts` | Les types partagés (`Webtoon`, `Release`, `UserRelease`...) |
| `app/lib/format.ts` | Libellés des statuts, langues, dates |
| `app/lib/hooks.ts` | Pagination au scroll, ajout à la bibliothèque, ouverture d'une fiche |
| `app/lib/cookies.ts` | Lecture et écriture des cookies |
| `app/utils/userAuth.tsx` | Devient un `AuthProvider`. `useAuth()` s'utilise comme avant |
| `app/components/feedback.tsx` | Notifications et boîtes de confirmation |
| `app/components/ui.tsx` | Boutons, champs, barre de recherche, états vides |
| `app/components/theme.tsx` | Gestion du thème, mémorisé dans le navigateur |

**Pourquoi**
- **Une seule URL d'API.** `http://127.0.0.1:8000` était écrit en dur dans une vingtaine d'endroits. Avec Docker, le front doit pouvoir pointer ailleurs (`http://backend:8000`). Il suffit maintenant de changer une variable d'environnement.
- **Des types partagés.** Chaque page redéclarait ses propres types, avec des différences d'une page à l'autre (`addable` / `addble`, champs optionnels ou non).
- **Un seul contrôle de session.** Chaque composant qui appelait `useAuth()` vérifiait le token de son côté, donc 2 ou 3 appels à `/verify_token/` par page. Le provider le fait une seule fois pour toute l'app.
- **Des notifications à la place des pop-ups.** Les `alert()` et `confirm()` du navigateur bloquent la page, ont un rendu différent selon le navigateur et sont pénibles sur mobile.

## 5. Bugs corrigés

1. **Refuser une demande admin ne marchait jamais.** L'appel visait `/api/webtoon/set_to_public/` sans identifiant, une route qui n'existe pas. Refuser fait maintenant un `PATCH` sur le webtoon avec `waiting_review: false`, et l'entrée redevient privée.
2. **Le filtre de statut de la recherche ne trouvait rien.** Il envoyait `ongoing`, `completed` et `hiatus`, alors que le back attend `in progress`, `finish`, `pause` et `cancel`.
3. **La langue choisie à la création était ignorée.** La requête envoyait toujours `"eng"`.

## 6. Fichiers supprimés

- `app_to_up/` : une ancienne copie de `layout.tsx` et `page.tsx` qui ne compilait plus et **bloquait `npm run build`**.
- `postcss.config.mjs` : la config Tailwind 4, alors que le projet utilise Tailwind 3 avec `postcss.config.js`.
- `components/logout.tsx` : remplacé par la boîte de confirmation commune.

## 7. À faire côté back

- **Les filtres min et max de chapitres renvoient une erreur 500.** Dans `WebtoonFilter` (`api/views/webtoon.py`), le champ est `releases__total_chapter`, alors que la relation s'appelle `release`.
- **La valeur de `addable` est inversée selon l'endpoint.** Dans les listes, `addable: true` veut dire « pas encore dans la bibliothèque ». Dans `retrieve`, ça veut dire « déjà dans la bibliothèque ». Le front gère les deux cas, mais il faudrait harmoniser.

## 8. Pas encore fait

- **La série ouverte est toujours transmise par le cookie `webtoon`.** Elle pourrait passer dans l'URL, par exemple `/webtoon/[id]`, ce qui rendrait les liens partageables.
- **Les tests Jest prévus dans le plan QA** n'existent pas encore.
