import { Router } from 'express';
import { 
  createFile, 
  uploadFileContent, 
  getFileMetadata, 
  downloadFileContent, 
  upload 
} from '../controllers/file.controller';
import { authenticateJWT } from '../middlewares/auth.middleware';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Fichiers
 *   description: API de gestion des fichiers
 */

// Routes pour la création et l'upload de fichiers
router.post('/folders/:folderId/files', authenticateJWT, createFile);
router.post('/files/:fileId/upload', authenticateJWT, upload.single('content'), uploadFileContent);

// Routes pour récupérer les informations et le contenu des fichiers
router.get('/files/:fileId', authenticateJWT, getFileMetadata);
router.get('/files/:fileId/content', authenticateJWT, downloadFileContent);

export { router as fileRoutes };
