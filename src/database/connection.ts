import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Créer un pool de connexions à la base de données
const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// Fonction pour exécuter une procédure stockée avec des paramètres
export const callProcedure = async (procedureName: string, params: any[] = []) => {
  const client = await pool.connect();
  try {
    // Construire la chaîne de requête pour appeler une procédure stockée dans le schéma kemet
    const paramPlaceholders = params.map((_, i) => `$${i + 1}`).join(', ');
    const query = `SELECT * FROM ${process.env.DB_SCHEMA}.${procedureName}(${paramPlaceholders})`;
    
    const result = await client.query(query, params);
    return result.rows;
  } catch (error) {
    console.error('Erreur lors de l\'appel à la procédure stockée:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Fonction pour tester la connexion à la base de données
export const testConnection = async () => {
  try {
    const client = await pool.connect();
    console.log('Connexion à la base de données établie avec succès');
    client.release();
    return true;
  } catch (error) {
    console.error('Impossible de se connecter à la base de données:', error);
    return false;
  }
};

export default pool;
