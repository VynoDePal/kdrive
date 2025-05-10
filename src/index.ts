import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import { authRoutes } from './routes/auth.routes';
import { folderRoutes } from './routes/folder.routes';
import { fileRoutes } from './routes/file.routes';
import { shareRoutes } from './routes/share.routes';
import { fileVersionRoutes } from './routes/file-version.routes';
import errorHandler from './middlewares/error.middleware';
import { specs } from './config/swagger';

// Charger les variables d'environnement
dotenv.config();

// Initialiser l'application Express
const app = express();
const port = process.env.PORT || 3000;

// Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());

// Configuration Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'KDrive API Documentation',
}));

// Routes
app.use('/api', authRoutes);
app.use('/api', folderRoutes);
app.use('/api', fileRoutes);
app.use('/api', shareRoutes);
app.use('/api', fileVersionRoutes);

// Route racine pour rediriger vers la documentation
app.get('/', (req, res) => {
  res.redirect('/api-docs');
});

// Middleware de gestion d'erreurs
app.use(errorHandler);

// Démarrer le serveur
app.listen(port, () => {
  console.log(`Serveur démarré sur le port ${port}`);
  console.log(`Documentation API disponible sur http://localhost:${port}/api-docs`);
});
