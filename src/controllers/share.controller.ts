import { Response } from 'express';
import { callProcedure } from '../database/connection';
import { AuthRequest } from '../middlewares/auth.middleware';

/**
 * @swagger
 * components:
 *   schemas:
 *     ShareFileRequest:
 *       type: object
 *       required:
 *         - fileId
 *         - shareeEmails
 *         - permission
 *       properties:
 *         fileId:
 *           type: integer
 *           description: ID du fichier à partager
 *         shareeEmails:
 *           type: array
 *           items:
 *             type: string
 *             format: email
 *           description: Liste des emails des utilisateurs avec qui partager
 *         permission:
 *           type: string
 *           enum: [read, write]
 *           description: Permission accordée aux utilisateurs (lecture ou écriture)
 *     ShareResponse:
 *       type: object
 *       properties:
 *         shareId:
 *           type: integer
 *           description: ID du partage créé
 *     ShareList:
 *       type: object
 *       properties:
 *         shares:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               id:
 *                 type: integer
 *                 description: ID du partage
 *               fileId:
 *                 type: integer
 *                 description: ID du fichier partagé
 *               fileName:
 *                 type: string
 *                 description: Nom du fichier partagé
 *               sharerEmail:
 *                 type: string
 *                 description: Email de la personne qui a partagé le fichier
 *               shareeEmail:
 *                 type: string
 *                 description: Email de la personne avec qui le fichier est partagé
 *               permission:
 *                 type: string
 *                 enum: [read, write]
 *                 description: Permission accordée
 *               createdAt:
 *                 type: string
 *                 format: date-time
 *                 description: Date de création du partage
 */

/**
 * @swagger
 * /shares:
 *   post:
 *     summary: Partage un fichier avec des utilisateurs
 *     tags: [Partages]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ShareFileRequest'
 *     responses:
 *       201:
 *         description: Fichier partagé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ShareResponse'
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
 *         description: Fichier introuvable
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
export const shareFile = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Utilisateur non authentifié' });
    }

    const { fileId, shareeEmails, permission } = req.body;
    const sharerId = req.user.id;

    // Validation des données
    if (!fileId || !Number.isInteger(fileId)) {
      return res.status(400).json({ message: 'ID de fichier invalide' });
    }

    if (!shareeEmails || !Array.isArray(shareeEmails) || shareeEmails.length === 0) {
      return res.status(400).json({ message: 'Liste d\'emails invalide' });
    }

    if (!permission || !['read', 'write'].includes(permission)) {
      return res.status(400).json({ message: 'Permission invalide, doit être "read" ou "write"' });
    }
    
    // Vérifier que le fichier existe et appartient à l'utilisateur
    const fileCheck = await callProcedure('check_file_ownership', [fileId, sharerId]);
    
    if (fileCheck.length === 0 || !fileCheck[0].exists) {
      return res.status(404).json({ message: 'Fichier introuvable ou vous n\'êtes pas autorisé à le partager' });
    }

    // Créer le partage pour chaque email
    const shares = [];
    for (const email of shareeEmails) {
      const result = await callProcedure('create_share', [sharerId, email, fileId, permission]);
      shares.push(result[0].share_id);
    }

    return res.status(201).json({ shareId: shares[0] });
  } catch (error) {
    console.error('Erreur lors du partage du fichier:', error);
    return res.status(500).json({ message: 'Erreur serveur lors du partage du fichier' });
  }
};

/**
 * @swagger
 * /shares:
 *   get:
 *     summary: Liste les partages de l'utilisateur courant
 *     tags: [Partages]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des partages récupérée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ShareList'
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
export const listShares = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Utilisateur non authentifié' });
    }

    const userId = req.user.id;

    // Récupérer les partages où l'utilisateur est impliqué (partageur ou destinataire)
    const shares = await callProcedure('list_user_shares', [userId]);

    return res.json({ shares });
  } catch (error) {
    console.error('Erreur lors de la récupération des partages:', error);
    return res.status(500).json({ message: 'Erreur serveur lors de la récupération des partages' });
  }
};
