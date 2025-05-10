import { Router } from 'express';
import { createFolder, getFolderContents, getRootFolders } from '../controllers/folder.controller';
import { authenticateJWT } from '../middlewares/auth.middleware';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Dossiers
 *   description: API de gestion des dossiers
 */

// Routes des dossiers - toutes requièrent une authentification
router.post('/', authenticateJWT, createFolder);
router.get('/', authenticateJWT, getRootFolders);
router.get('/:folderId', authenticateJWT, getFolderContents);

export { router as folderRoutes };
