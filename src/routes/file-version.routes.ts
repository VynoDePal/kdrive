import express from 'express';
import { authenticateJWT } from '../middlewares/auth.middleware';
import { listFileVersions, getFileVersion } from '../controllers/file-version.controller';

export const fileVersionRoutes = express.Router();

/**
 * Routes pour les versions de fichiers
 * Ces routes nécessitent une authentification JWT
 */

// Route pour lister toutes les versions d'un fichier
fileVersionRoutes.get('/files/:fileId/versions', authenticateJWT, listFileVersions);

// Route pour accéder à une version spécifique d'un fichier
fileVersionRoutes.get('/files/:fileId/versions/:versionId', authenticateJWT, getFileVersion);
