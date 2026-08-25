# Check-list de voyage partagée

Application web autoportée (un seul fichier `index.html`) + PWA, pour préparer une check-list de voyage à plusieurs, synchronisée en temps réel via Firebase (ou utilisable 100 % en local).

## Fichiers

- `index.html` — l'application entière (HTML + CSS + JS), aucune dépendance à builder.
- `manifest.json` — manifeste PWA (icône, nom, couleurs).
- `service-worker.js` — mise en cache de l'app shell pour le mode hors-ligne.
- `icon-192.png`, `icon-512.png`, `icon-512-maskable.png` — icônes de l'app.

Aucune étape de build n'est nécessaire : ces 6 fichiers, mis à la racine d'un dépôt, suffisent.

## 1. Déployer sur GitHub Pages

1. Créez un dépôt GitHub (public) et placez-y les 6 fichiers ci-dessus, tous au même niveau (racine du dépôt, ou dans un dossier `docs/`).
2. Dans **Settings → Pages**, choisissez la branche (`main`) et le dossier (`/root` ou `/docs`) à publier.
3. Votre app est en ligne sur `https://<votre-utilisateur>.github.io/<votre-repo>/`.

Tous les chemins du projet (`./manifest.json`, `./service-worker.js`, icônes…) sont **relatifs**, donc ça fonctionne aussi bien à la racine d'un domaine que dans un sous-dossier de type `.github.io/repo/`.

## 2. Utilisation sans Firebase (mode local)

Par défaut, sans aucune configuration, l'application fonctionne en **mode local** :
- Les profils et les événements créés sont stockés uniquement dans le `localStorage` du navigateur.
- Pas de partage entre appareils/utilisateurs tant que Firebase n'est pas configuré.
- Vous pouvez tester toutes les fonctionnalités (profil, catégories, tags, ajout/suppression/déplacement d'items, états) sans rien configurer.

## 3. Activer la synchronisation Firebase

1. Créez un projet sur [console.firebase.google.com](https://console.firebase.google.com).
2. Activez **Firestore Database** (mode production ou test, peu importe — les règles ci-dessous s'appliquent ensuite).
3. Activez **Authentication → Sign-in method → Anonyme** (l'app se connecte automatiquement de façon anonyme pour respecter des règles de sécurité minimales).
4. Dans **Paramètres du projet → Vos applications → Web**, créez une "app web" et récupérez les valeurs de configuration :
   `apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`.
5. Dans l'application, ouvrez **⚙️ Paramètres Firebase** et collez ces valeurs, puis "Enregistrer & connecter".
6. Configurez les règles Firestore (**Firestore Database → Règles**) :

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /events/{eventId} {
      allow read, write: if request.auth != null;
    }
    match /users/{userId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

> ⚠️ Ces règles autorisent la lecture/écriture à tout utilisateur authentifié anonymement (donc n'importe qui possédant le lien de l'app). La confidentialité repose sur le caractère "secret" du code à 6 caractères de chaque événement (et de chaque profil), comme un lien de partage classique. Pour un usage plus strict, adaptez les règles à vos besoins (ex. limiter par un champ `allowedUsers`).

La configuration Firebase saisie est stockée dans le `localStorage` du navigateur (ce ne sont pas des secrets serveur : une `apiKey` Firebase web est conçue pour être publique, la sécurité réelle vient des règles Firestore).

## 4. Exporter une check-list locale vers Firebase

Si vous avez commencé à utiliser l'app en local, puis configuré Firebase :
- Ouvrez votre événement local.
- Un bandeau "📦 Check-list locale sur cet appareil" propose **Exporter vers Firebase ☁️**.
- L'événement est recopié tel quel dans Firestore (même code si disponible, sinon un nouveau code est généré), et l'app bascule automatiquement en mode synchronisé.

## 5. Profils utilisateur (multi-appareils)

Au tout premier lancement, l'application demande un nom pour créer un **profil** :
- Un code à 6 caractères est généré (même principe que les codes d'événement) et affiché à l'utilisateur — à conserver pour se reconnecter plus tard.
- Ce profil est stocké dans Firestore sous `users/{code}` (ou en local si Firebase n'est pas configuré), avec la liste des checklists créées/rejointes : `{ name, checklists: [{code, name, mode}], createdAt }`.
- Toute checklist créée ou rejointe pendant que le profil est actif s'ajoute automatiquement à "Mes checklists" sur l'écran d'accueil.
- Depuis un autre appareil, entrer ce même code (bouton "Vous avez déjà un profil ?") redonne accès à exactement la même liste de checklists.
- La session reste mémorisée sur l'appareil (pas besoin de retaper le code à chaque visite) ; le bouton "Changer de profil" permet de se déconnecter et d'en utiliser un autre.
- Retirer une checklist de "Mes checklists" (bouton ✕) ne supprime pas la checklist elle-même — elle reste accessible via son code, et peut être rajoutée plus tard.

⚠️ Comme pour les événements, un profil créé en mode local (sans Firebase) reste local à cet appareil : pour un usage multi-appareils, configurez d'abord Firebase (étape 3) avant de créer votre profil.

## 6. Installer en PWA

Sur mobile (Chrome/Safari) ou desktop (Chrome/Edge) : ouvrez l'URL GitHub Pages, puis utilisez "Ajouter à l'écran d'accueil" / "Installer l'application". Le service worker met en cache l'app shell pour un lancement rapide et un fonctionnement hors-ligne (les données Firebase nécessitent bien sûr une connexion pour se synchroniser).

## Fonctionnement des états d'un item

Chaque item d'une catégorie a 3 états, dans cet ordre de bascule (toucher le rond à gauche de l'item) :

1. **À faire** (cercle vide) — état initial.
2. **Validé** (vert, ✓) — fait / acheté / pris. L'item descend en bas de sa catégorie.
3. **Annulé** (gris, ✕, texte barré) — pas besoin de le faire, mais on garde une trace. Descend encore plus bas.
4. Un nouveau toucher revient à "À faire".

Chaque item peut être renommé (toucher le texte), déplacé vers une autre catégorie (bouton ⋮ → choisir la catégorie), supprimé (bouton ⋮ → Supprimer), ou associé à un **tag** (bouton ⋮ → section Tag) pour le regrouper avec d'autres items similaires à l'intérieur de sa catégorie (voir plus bas).

## Catégories (personnalisables)

Les catégories ne sont plus figées : chaque événement démarre avec les 5 catégories classiques ci-dessous, mais elles peuvent être **renommées, recolorées, réordonnées ou supprimées**, et vous pouvez en **ajouter de nouvelles**, via le bouton ⋮ sur chaque en-tête de catégorie (ou "+ Add category" en bas de la liste).

- À acheter (ex : bouteille de gaz, crème solaire…)
- À emporter (ex : passeports, chargeurs…)
- Avant de partir (ex : éteindre le gaz, vider le frigo…)
- Pendant le voyage
- Après le voyage (ex : faire la lessive…)

Toutes les catégories démarrent **repliées** à chaque ouverture d'un événement.

Les événements créés avant l'ajout de cette fonctionnalité (sans catégories personnalisées enregistrées) reçoivent automatiquement ces 5 catégories par défaut à leur prochaine ouverture, sans rien perdre : les items déjà classés restent dans la bonne catégorie.

## Tags (sous-catégories transversales)

En plus des catégories principales, vous pouvez créer des **tags** libres (ex : Nourriture, Camping, Voiture) via le bouton **🏷️** dans l'en-tête de l'événement. Un tag est indépendant des catégories : le même tag peut regrouper des items dans "À acheter" *et* dans "Pendant le voyage", par exemple.

- Un item sans tag reste affiché normalement dans sa catégorie.
- Un item tagué est regroupé sous un petit en-tête plié/dépliable (avec pastille de couleur) à l'intérieur de sa catégorie.
- Supprimer un tag ne supprime jamais les items concernés : ils perdent simplement ce tag.
