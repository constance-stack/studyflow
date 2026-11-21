# StudyFlow

Application de révision intelligente tout-en-un (mathématiques, langues, histoire, etc.), pensée pour un usage
personnel, mobile-first (iPhone) et entièrement gratuite.

## Lancer l'application

```bash
npm install
npm run dev
```

Ouvre l'URL affichée (`http://localhost:5173` par défaut) dans ton navigateur. Sur iPhone, tu peux ensuite
l'ajouter à l'écran d'accueil (Safari → bouton de partage → "Sur l'écran d'accueil") pour l'utiliser en PWA.

## Architecture

- **React + TypeScript + Vite**, Tailwind CSS v4 pour le style.
- **Aucun backend** : toutes les données sont stockées localement dans le navigateur via **IndexedDB** (Dexie.js).
  C'est gratuit, fonctionne hors-ligne, et évite tout serveur à maintenir.
- **PWA** (`vite-plugin-pwa`) : installable, fonctionne hors-ligne.
- **IA configurable** (`src/ai/`) : Google Gemini (gratuit, recommandé) ou tout fournisseur compatible OpenAI
  (Groq, Ollama en local, OpenRouter...). Appelée directement depuis le navigateur, jamais via un serveur à nous.
- **KaTeX** pour le rendu des formules mathématiques (`$...$`, `$$...$$`), chargé à la demande.

## Toutes les phases sont implémentées (1 à 5)

### Bibliothèque de cours
Matières (couleur + icône), dossiers imbriqués, chapitres — créer/renommer/dupliquer/déplacer/archiver/supprimer à
tous les niveaux, réorganisation des chapitres. Import de PDF/photos/notes, visualiseurs PDF et image, texte
extrait modifiable manuellement. Recherche globale (matières/dossiers/chapitres/documents).

### Intelligence artificielle
Configuration explicite (coûts et confidentialité affichés avant toute activation, clé jamais incluse dans les
sauvegardes), analyse de documents (transcription + résumé, signale les passages illisibles plutôt que d'inventer),
assistant IA conversationnel avec contexte de cours, génération d'activités et de fiches de révision — toujours à
partir du contenu réellement importé, jamais inventé.

### Activités de révision — les 12 types du cahier des charges
Flashcards (recto/verso, image possible), QCM, mini-leçons, questions ouvertes (auto-évaluées + correction IA
optionnelle), vrai/faux, textes à trous, associations (matching), vocabulaire (avec prononciation via la synthèse
vocale du navigateur), chronologie (réordonnancement), questions de réflexion/dissertation, mini-exercices et
exercices complets (indices progressifs + correction étape par étape). Chaque type peut être **généré par l'IA**
ou **créé/modifié à la main** sans IA (ajout, édition, suppression d'éléments individuels, favoris).

### Révision interactive
Mode Mixte (mélange les types sans répétition consécutive), classification façon Quizlet (🔴🟠🟢⭐) après chaque
carte, répétition espacée (algorithme simplifié façon SM-2), mode "jusqu'à tout connaître", sessions par nombre de
cartes **ou par durée** (5 à 60 min), **session interrompue reprenable** (reprend exactement où tu t'es arrêtée),
dictée vocale pour les réponses longues (API Web Speech du navigateur, en remplacement honnête d'un véritable mode
oral noté).

### Examens et calendrier
Calendrier (agenda + vue mois), examens à venir avec compte à rebours, planning de révision généré par IA et
éditable. Examens blancs générés par IA (QCM + questions ouvertes, barème respecté), chronométrés, corrigés
automatiquement (QCM) ou par IA (questions ouvertes), historique consultable.

### Statistiques et progression
Calculées uniquement à partir des sessions et réponses réellement enregistrées : temps de révision, taux de
réussite, progression par matière, répartition des notions, calendrier des jours étudiés (heatmap), historique des
sessions et des examens blancs. Page "Mes notions" : parcourir, filtrer et corriger manuellement la maîtrise de
chaque carte.

### Fiches de révision
Génération IA (résumé court/détaillé, définitions, formules, chronologique, vocabulaire, littérature), export en
PDF via l'impression du navigateur (fonctionne nativement sur iPhone : partager → enregistrer en PDF).

### Gamification (désactivable)
Points XP, niveaux, série de jours (streak), objectif quotidien de cartes — un interrupteur dans "Plus" désactive
tout si tu préfères une interface sans ces éléments.

### Finitions
Mode concentration (minuteur type Pomodoro), rappel de révision quotidien (voir limite ci-dessous), export/import
de sauvegarde complète, écran d'erreur générique si un bug inattendu survient (au lieu d'un écran blanc), mode
clair/sombre/système, interface mobile-first + barre latérale sur grand écran.

## Limites assumées (honnêtes, pas de fonctionnalité simulée)

- **Notifications de révision** : ne fonctionnent que si StudyFlow est ouvert dans un onglet au moment du rappel.
  Sans serveur backend, il n'existe pas de notification push fiable en arrière-plan pour une PWA — c'est expliqué
  directement dans l'écran de réglage, pas seulement ici.
- **Correction d'examen oral** : il n'y a pas de notation d'une véritable prestation orale. La dictée vocale
  convertit la parole en texte (via l'API du navigateur), qui est ensuite corrigée comme une réponse écrite.
- **Vérification mathématique des réponses** : la correction des exercices/examens s'appuie sur l'IA (avec
  affichage de KaTeX pour la lisibilité), pas sur un véritable moteur de calcul formel (CAS).
- **Langue de l'interface** : l'application est entièrement en français (comme demandé), il n'y a pas de bascule
  vers une autre langue — cela demanderait de traduire toute l'interface et tous les prompts IA, disproportionné
  pour un usage personnel dans ta langue.
- **Import d'un ancien examen pour en générer un similaire** : non implémenté (tu peux en revanche décrire le
  style souhaité dans les instructions libres lors de la génération d'un examen blanc).

## Comment tester

1. `npm run dev`, créer une matière → dossier → chapitre, importer un document ou créer une note.
2. "Assistant IA" → configurer une clé Gemini gratuite (aistudio.google.com) → tester la connexion.
3. Sur un document : "Analyser avec l'IA". Dans un chapitre : "Générer" (choisir un des 12 types) ou "Créer"
   (sans IA). Essayer aussi "Modifier le contenu" sur une activité existante.
4. "Réviser" : lancer une session mixte, essayer chaque type de carte, le mode "jusqu'à tout connaître", une
   session par durée, et vérifier qu'en quittant sans terminer, "Reprendre la session en cours" réapparaît.
5. "Calendrier" : ajouter un examen, générer un planning de révision.
6. "Examens" : générer et passer un examen blanc, vérifier la correction et l'historique.
7. "Statistiques" : vérifier les chiffres, ouvrir "Mes notions" et corriger une maîtrise à la main.
8. "Plus" : fiche de révision (PDF), mode concentration, rappel de révision, désactiver la gamification, exporter
   une sauvegarde.

## À savoir

Tes données (y compris la clé API si tu en configures une, bien que celle-ci soit exclue des sauvegardes) sont
stockées uniquement dans ce navigateur, sur cet appareil. Si tu changes de téléphone, désinstalles l'app ou vides
les données du site, elles sont perdues — exporte une sauvegarde régulièrement depuis "Plus".
