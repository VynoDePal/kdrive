import { Router } from 'express';
import { shareFile, listShares } from '../controllers/share.controller';
import { authenticateJWT } from '../middlewares/auth.middleware';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Partages
 *   description: API de gestion des partages de fichiers
 */

// Routes pour les partages, toutes protégées par l'authentification JWT
router.post('/shares', authenticateJWT, shareFile);
router.get('/shares', authenticateJWT, listShares);

export { router as shareRoutes };
