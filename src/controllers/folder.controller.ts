import { Response } from 'express';
import { callProcedure } from '../database/connection';
import { AuthRequest } from '../middlewares/auth.middleware';

/**
 * @swagger
 * /folders:
 *   post:
 *     summary: Crée un dossier ou sous-dossier
 *     tags: [Dossiers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateFolderRequest'
 *     responses:
 *       201:
 *         description: Dossier créé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CreateFolderResponse'
 *       400:
 *         description: Données d'entrée invalides
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Non autorisé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Dossier parent introuvable
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
export const createFolder = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Utilisateur non authentifié' });
    }

    const { name, parentId } = req.body;
    const ownerId = req.user.id;

    // Validation des données
    if (!name || name.trim() === '') {
      return res.status(400).json({ message: 'Nom de dossier requis' });
    }

    // Créer le dossier
    try {
      const result = await callProcedure('create_folder', [name, parentId || null, ownerId]);
      const folderId = result[0].folder_id;

      return res.status(201).json({ id: folderId });
    } catch (error: any) {
      if (error.message.includes('Dossier parent introuvable')) {
        return res.status(404).json({ message: 'Dossier parent introuvable ou non autorisé' });
      }
      throw error;
    }
  } catch (error) {
    console.error('Erreur lors de la création du dossier:', error);
    return res.status(500).json({ message: 'Erreur serveur lors de la création du dossier' });
  }
};

/**
 * @swagger
 * /folders/{folderId}:
 *   get:
 *     summary: Liste le contenu d'un dossier (sous-dossiers)
 *     tags: [Dossiers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: folderId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID du dossier à consulter
 *     responses:
 *       200:
 *         description: Contenu du dossier récupéré avec succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FolderContentsResponse'
 *       401:
 *         description: Non autorisé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Dossier introuvable
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
export const getFolderContents = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Utilisateur non authentifié' });
    }

    const folderId = parseInt(req.params.folderId);
    const ownerId = req.user.id;

    // Validation des données
    if (isNaN(folderId)) {
      return res.status(400).json({ message: 'ID de dossier invalide' });
    }

    // Récupérer les informations du dossier
    const folderInfo = await callProcedure('get_folder_by_id', [folderId, ownerId]);
    
    if (folderInfo.length === 0) {
      return res.status(404).json({ message: 'Dossier introuvable ou non autorisé' });
    }

    // Récupérer les sous-dossiers
    const subfolders = await callProcedure('list_subfolders', [folderId, ownerId]);

    // Construire la réponse (pour l'instant sans les fichiers car ils ne sont pas encore implémentés)
    return res.json({
      id: folderInfo[0].id,
      name: folderInfo[0].name,
      contents: {
        folders: subfolders,
        files: [] // Pour une implémentation future
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du contenu du dossier:', error);
    return res.status(500).json({ message: 'Erreur serveur lors de la récupération du contenu du dossier' });
  }
};

/**
 * @swagger
 * /folders:
 *   get:
 *     summary: Liste les dossiers racines de l'utilisateur
 *     tags: [Dossiers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dossiers racines récupérés avec succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RootFoldersResponse'
 *       401:
 *         description: Non autorisé
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
export const getRootFolders = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Utilisateur non authentifié' });
    }

    const ownerId = req.user.id;

    // Récupérer les dossiers racines
    const rootFolders = await callProcedure('list_root_folders', [ownerId]);

    return res.json({
      folders: rootFolders
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des dossiers racines:', error);
    return res.status(500).json({ message: 'Erreur serveur lors de la récupération des dossiers racines' });
  }
};
