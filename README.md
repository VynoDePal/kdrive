# KDrive API

API REST développée avec Node.js, Express, TypeScript et PostgreSQL pour la gestion et le partage sécurisé de fichiers. L'API utilise exclusivement des procédures stockées pour interagir avec la base de données, offrant ainsi une meilleure sécurité et performance.

## Fonctionnalités principales

- **Authentification sécurisée** : Système complet avec JWT pour la gestion des sessions
- **Gestion de fichiers** : Upload, téléchargement, modification et suppression de fichiers
- **Organisation en dossiers** : Création d'une structure hiérarchique de dossiers
- **Partage de ressources** : Possibilité de partager fichiers et dossiers avec d'autres utilisateurs
- **Versionnement de fichiers** : Suivi des modifications avec historique des versions
- **Documentation API** : Interface Swagger intégrée pour explorer et tester les endpoints

## Architecture

- **Niveau Application** : Serveur Node.js avec Express et TypeScript
  - Controllers pour la logique métier
  - Routes pour définir les endpoints API
  - Middlewares pour la validation et l'authentification
  - Gestion des erreurs centralisée
  - Swagger pour la documentation

- **Niveau Données** : PostgreSQL avec procédures stockées
  - Séparation claire entre la logique applicative et l'accès aux données
  - Sécurité renforcée contre les injections SQL
  - Performance optimisée pour les opérations complexes

## Technologies utilisées

### Backend
- **Node.js** : Environnement d'exécution JavaScript
- **Express** : Framework web pour Node.js
- **TypeScript** : Typage statique pour JavaScript
- **PostgreSQL** : Système de gestion de base de données relationnelle
- **JWT (JSON Web Tokens)** : Authentification sécurisée
- **Bcrypt** : Hachage sécurisé des mots de passe
- **Multer** : Gestion des uploads de fichiers
- **Swagger** : Documentation interactive de l'API

### DevOps & Outils
- **Yarn** : Gestionnaire de paquets
- **ts-node-dev** : Serveur de développement avec rechargement à chaud
- **Dotenv** : Gestion des variables d'environnement
- **Helmet** : Sécurisation des en-têtes HTTP
- **CORS** : Gestion des requêtes cross-origin

## Installation et démarrage

### Prérequis
- Node.js (v14+)
- PostgreSQL (v12+)
- Yarn

### Installation

- **Backend**: Node.js, Express, TypeScript
- **Base de données**: PostgreSQL
- **Bibliothèques**: pg, jsonwebtoken, bcrypt

## Prérequis

- Node.js (v14+)
- PostgreSQL (v12+)
- Yarn

## Installation

1. Cloner le dépôt
2. Installer les dépendances:
   ```
   yarn install
   ```
3. Configurer les variables d'environnement:
   - Copier le fichier `.env.example` vers `.env`
   - Modifier les valeurs selon votre environnement

4. Configurer la base de données:
   ```
   yarn db:setup
   ```

## Développement

Lancer le serveur en mode développement:
