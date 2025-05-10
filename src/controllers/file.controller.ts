import { Request, Response } from 'express';
import { callProcedure } from '../database/connection';
import { AuthRequest } from '../middlewares/auth.middleware';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Configuration de multer pour le stockage temporaire des fichiers
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const tempDir = os.tmpdir();
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix);
  }
});

export const upload = multer({ storage });

/**
 * @swagger
 * /folders/{folderId}/files:
 *   post:
 *     summary: Crée un fichier (métadonnées)
 *     tags: [Fichiers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: folderId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID du dossier dans lequel créer le fichier
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateFileRequest'
 *     responses:
 *       201:
 *         description: Fichier créé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CreateFileResponse'
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
export const createFile = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Utilisateur non authentifié' });
    }

    const { name, type } = req.body;
    const folderId = parseInt(req.params.folderId);
    const ownerId = req.user.id;

    // Validation des données
    if (!name || name.trim() === '') {
      return res.status(400).json({ message: 'Nom de fichier requis' });
    }
    
    if (!type || type.trim() === '') {
      return res.status(400).json({ message: 'Type de fichier requis' });
    }

    if (isNaN(folderId) || folderId <= 0) {
      return res.status(400).json({ message: 'ID de dossier invalide' });
    }

    // Créer le fichier (métadonnées seulement)
    try {
      const result = await callProcedure('create_file', [name, folderId, ownerId, type]);
      const fileId = result[0].file_id;

      return res.status(201).json({ id: fileId });
    } catch (error: any) {
      if (error.message.includes('Dossier introuvable')) {
        return res.status(404).json({ message: 'Dossier introuvable ou non autorisé' });
      }
      throw error;
    }
  } catch (error) {
    console.error('Erreur lors de la création du fichier:', error);
    return res.status(500).json({ message: 'Erreur serveur lors de la création du fichier' });
  }
};

/**
 * @swagger
 * /files/{fileId}/upload:
 *   post:
 *     summary: Importe le contenu d'un fichier (nouvelle version)
 *     tags: [Fichiers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: fileId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID du fichier
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Version créée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FileVersionResponse'
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
export const uploadFileContent = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Utilisateur non authentifié' });
    }

    const fileId = parseInt(req.params.fileId);
    const ownerId = req.user.id;

    if (isNaN(fileId) || fileId <= 0) {
      return res.status(400).json({ message: 'ID de fichier invalide' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Aucun fichier fourni' });
    }

    // Lire le contenu du fichier uploadé
    const filePath = req.file.path;
    const fileContent = fs.readFileSync(filePath);

    try {
      // Créer une nouvelle version du fichier
      const result = await callProcedure('create_file_version', [fileId, fileContent, ownerId]);
      
      // Supprimer le fichier temporaire
      fs.unlinkSync(filePath);

      return res.status(201).json({ 
        versionId: result[0].version_id,
        versionNumber: result[0].version_number
      });
    } catch (error: any) {
      // Supprimer le fichier temporaire en cas d'erreur
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      if (error.message.includes('Fichier introuvable')) {
        return res.status(404).json({ message: 'Fichier introuvable ou non autorisé' });
      }
      throw error;
    }
  } catch (error) {
    console.error('Erreur lors de l\'upload du fichier:', error);
    return res.status(500).json({ message: 'Erreur serveur lors de l\'upload du fichier' });
  }
};

/**
 * @swagger
 * /files/{fileId}:
 *   get:
 *     summary: Consulte les métadonnées d'un fichier
 *     tags: [Fichiers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: fileId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID du fichier
 *     responses:
 *       200:
 *         description: Métadonnées du fichier
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FileMetadata'
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
export const getFileMetadata = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Utilisateur non authentifié' });
    }

    const fileId = parseInt(req.params.fileId);
    const ownerId = req.user.id;

    if (isNaN(fileId) || fileId <= 0) {
      return res.status(400).json({ message: 'ID de fichier invalide' });
    }

    try {
      // Récupérer les métadonnées du fichier
      const fileResult = await callProcedure('get_file_by_id', [fileId, ownerId]);
      
      if (fileResult.length === 0) {
        return res.status(404).json({ message: 'Fichier introuvable ou non autorisé' });
      }
      
      const fileData = fileResult[0];
      
      // Récupérer les versions du fichier
      const versionsResult = await callProcedure('get_file_versions', [fileId, ownerId]);
      
      const versions = versionsResult.map((version: any) => ({
        id: version.id,
        versionNumber: version.version_number,
        createdAt: version.created_at
      }));

      return res.json({
        id: fileData.id,
        name: fileData.name,
        type: fileData.type,
        size: fileData.size,
        folderId: fileData.folder_id,
        createdAt: fileData.created_at,
        updatedAt: fileData.updated_at,
        versions
      });
    } catch (error: any) {
      if (error.message.includes('Fichier introuvable')) {
        return res.status(404).json({ message: 'Fichier introuvable ou non autorisé' });
      }
      throw error;
    }
  } catch (error) {
    console.error('Erreur lors de la récupération des métadonnées du fichier:', error);
    return res.status(500).json({ message: 'Erreur serveur lors de la récupération des métadonnées du fichier' });
  }
};

/**
 * @swagger
 * /files/{fileId}/content:
 *   get:
 *     summary: Télécharge le contenu de la dernière version d'un fichier
 *     tags: [Fichiers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: fileId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID du fichier
 *     responses:
 *       200:
 *         description: Contenu du fichier
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
 *         description: Fichier introuvable ou sans contenu
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
export const downloadFileContent = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Utilisateur non authentifié' });
    }

    const fileId = parseInt(req.params.fileId);
    const ownerId = req.user.id;

    if (isNaN(fileId) || fileId <= 0) {
      return res.status(400).json({ message: 'ID de fichier invalide' });
    }

    try {
      // Récupérer les métadonnées du fichier
      const fileResult = await callProcedure('get_file_by_id', [fileId, ownerId]);
      
      if (fileResult.length === 0) {
        return res.status(404).json({ message: 'Fichier introuvable ou non autorisé' });
      }
      
      const fileData = fileResult[0];
      
      // Récupérer le contenu de la dernière version
      const contentResult = await callProcedure('get_latest_file_content', [fileId, ownerId]);
      
      if (contentResult.length === 0) {
        return res.status(404).json({ message: 'Aucune version disponible pour ce fichier' });
      }
      
      const fileContent = contentResult[0].content;
      
      // Définir les en-têtes pour le téléchargement
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename=${encodeURIComponent(fileData.name)}`);
      res.setHeader('Content-Length', fileData.size);
      
      // Envoyer le contenu du fichier
      return res.send(fileContent);
    } catch (error: any) {
      if (error.message.includes('Fichier introuvable')) {
        return res.status(404).json({ message: 'Fichier introuvable ou non autorisé' });
      }
      throw error;
    }
  } catch (error) {
    console.error('Erreur lors du téléchargement du fichier:', error);
    return res.status(500).json({ message: 'Erreur serveur lors du téléchargement du fichier' });
  }
};
