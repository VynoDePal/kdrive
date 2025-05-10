# KDrive API

API REST développée avec Node.js, Express, TypeScript et PostgreSQL. L'API utilise exclusivement des procédures stockées pour interagir avec la base de données.

## Architecture

- **Niveau Application**: Serveur Node.js avec Express et TypeScript
- **Niveau Données**: PostgreSQL avec procédures stockées

## Technologies utilisées

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
