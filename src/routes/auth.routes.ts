import { Router } from 'express';
import { login, register } from '../controllers/auth.controller';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Authentification
 *   description: API d'authentification
 */

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

// Routes d'authentification
router.post('/login', login);
router.post('/register', register);

export { router as authRoutes };
