import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { callProcedure } from '../database/connection';

/**
 * @swagger
 * /register:
 *   post:
 *     summary: Crée un nouveau compte utilisateur
 *     tags: [Authentification]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: Utilisateur créé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RegisterResponse'
 *       400:
 *         description: Données d'entrée invalides
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: L'email est déjà utilisé
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
export const register = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Validation des données
    if (!email || !password) {
      return res.status(400).json({ message: 'Email et mot de passe requis' });
    }

    // Vérifier si l'utilisateur existe déjà
    const existingUsers = await callProcedure('get_user_by_email', [email]);
    if (existingUsers.length > 0) {
      return res.status(409).json({ message: 'Cet email est déjà utilisé' });
    }

    // Hasher le mot de passe
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Créer le nouvel utilisateur
    const result = await callProcedure('create_user', [email, passwordHash]);
    const userId = result[0].user_id;

    return res.status(201).json({ userId });
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement:', error);
    return res.status(500).json({ message: 'Erreur serveur lors de l\'enregistrement' });
  }
};

/**
 * @swagger
 * /login:
 *   post:
 *     summary: Authentifie un utilisateur et retourne un JWT
 *     tags: [Authentification]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Authentification réussie
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       400:
 *         description: Données d'entrée invalides
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Authentification échouée
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
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Validation des données
    if (!email || !password) {
      return res.status(400).json({ message: 'Email et mot de passe requis' });
    }

    // Récupérer l'utilisateur par email
    const users = await callProcedure('get_user_by_email', [email]);
    
    if (users.length === 0) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }

    const user = users[0];

    // Vérifier le mot de passe
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }

    // Créer le token JWT
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: process.env.JWT_EXPIRATION || '24h' }
    );

    return res.json({ token });
  } catch (error) {
    console.error('Erreur lors de la connexion:', error);
    return res.status(500).json({ message: 'Erreur serveur lors de la connexion' });
  }
};
