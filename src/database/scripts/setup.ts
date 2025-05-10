import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const setupDatabase = async () => {
  // Créer un pool de connexions avec l'utilisateur postgres pour pouvoir créer la base de données
  const adminPool = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: 'postgres', // Base de données par défaut pour l'administration
    user: 'postgres',     // Utilisateur admin par défaut
    password: process.env.POSTGRES_PASSWORD || 'postgres',
  });

  try {
    // Vérifier si la base de données existe déjà
    const checkDbResult = await adminPool.query(`
      SELECT 1 FROM pg_database WHERE datname = $1
    `, [process.env.DB_NAME]);

    // Créer la base de données si elle n'existe pas
    if (checkDbResult.rows.length === 0) {
      console.log(`Création de la base de données ${process.env.DB_NAME}...`);
      await adminPool.query(`CREATE DATABASE ${process.env.DB_NAME}`);
      console.log('Base de données créée avec succès');
    } else {
      console.log(`La base de données ${process.env.DB_NAME} existe déjà`);
    }

    // Fermer la connexion admin
    await adminPool.end();

    // Se connecter à la nouvelle base de données
    const dbPool = new Pool({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432', 10),
      database: process.env.DB_NAME,
      user: 'postgres',
      password: process.env.POSTGRES_PASSWORD || 'postgres',
    });

    // Lire et exécuter le script SQL
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    console.log('Exécution du script de schéma...');
    await dbPool.query(schemaSql);
    console.log('Script de schéma exécuté avec succès');

    await dbPool.end();
    
    console.log('Configuration de la base de données terminée avec succès');
  } catch (error) {
    console.error('Erreur lors de la configuration de la base de données:', error);
    process.exit(1);
  }
};

setupDatabase();
