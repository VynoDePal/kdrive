import { Response } from 'express';
import { callProcedure } from '../database/connection';
import { AuthRequest } from '../middlewares/auth.middleware';

/**
 * @swagger
 * /files/{fileId}/versions:
 *   get:
 *     summary: Liste les versions d'un fichier
 *     tags: [Versions de fichiers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: fileId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID du fichier dont on veut lister les versions
 *     responses:
 *       200:
 *         description: Versions récupérées avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 versions:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         description: ID de la version
 *                       versionNumber:
 *                         type: integer
 *                         description: Numéro de version
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         description: Date de création de la version
 *       401:
 *         description: Non autorisé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Fichier introuvable ou non autorisé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Erreur serveur
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export const listFileVersions = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Utilisateur non authentifié' });
    }

    const fileId = parseInt(req.params.fileId);
    const userId = req.user.id;

    // Validation des données
    if (isNaN(fileId)) {
      return res.status(400).json({ message: 'ID de fichier invalide' });
    }

    try {
      // Vérifier si l'utilisateur a accès au fichier
      const fileAccess = await callProcedure('check_file_access', [fileId, userId]);
      if (fileAccess.length === 0 || !fileAccess[0].has_access) {
        return res.status(404).json({ message: 'Fichier introuvable ou non autorisé' });
      }

      // Récupérer les versions du fichier
      const versions = await callProcedure('list_file_versions', [fileId]);

      return res.json({ versions });
    } catch (error: any) {
      if (error.message.includes('Fichier introuvable')) {
        return res.status(404).json({ message: 'Fichier introuvable ou non autorisé' });
      }
      throw error;
    }
  } catch (error) {
    console.error('Erreur lors de la récupération des versions du fichier:', error);
    return res.status(500).json({ message: 'Erreur serveur lors de la récupération des versions' });
  }
};

/**
 * @swagger
 * /files/{fileId}/versions/{versionId}:
 *   get:
 *     summary: Accède à une version spécifique d'un fichier
 *     tags: [Versions de fichiers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: fileId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID du fichier
 *       - in: path
 *         name: versionId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la version à récupérer
 *     responses:
 *       200:
 *         description: Version du fichier récupérée avec succès
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: Non autorisé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Fichier ou version introuvable
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Erreur serveur
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export const getFileVersion = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Utilisateur non authentifié' });
    }

    const fileId = parseInt(req.params.fileId);
    const versionId = parseInt(req.params.versionId);
    const userId = req.user.id;

    // Validation des données
    if (isNaN(fileId) || isNaN(versionId)) {
      return res.status(400).json({ message: 'ID de fichier ou de version invalide' });
    }

    try {
      // Vérifier si l'utilisateur a accès au fichier
      const fileAccess = await callProcedure('check_file_access', [fileId, userId]);
      if (fileAccess.length === 0 || !fileAccess[0].has_access) {
        return res.status(404).json({ message: 'Fichier introuvable ou non autorisé' });
      }

      // Récupérer la version spécifique du fichier
      const versionData = await callProcedure('get_file_version', [fileId, versionId]);
      
      if (versionData.length === 0) {
        return res.status(404).json({ message: 'Version introuvable pour ce fichier' });
      }

      // Définir les en-têtes de réponse pour le téléchargement
      res.setHeader('Content-Type', versionData[0].mime_type || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${versionData[0].file_name}"`);
      
      // Envoyer le contenu du fichier
      return res.send(versionData[0].content);
    } catch (error: any) {
      if (error.message.includes('Fichier introuvable') || error.message.includes('Version introuvable')) {
        return res.status(404).json({ message: 'Fichier ou version introuvable' });
      }
      throw error;
    }
  } catch (error) {
    console.error('Erreur lors de la récupération de la version du fichier:', error);
    return res.status(500).json({ message: 'Erreur serveur lors de la récupération de la version' });
  }
};
