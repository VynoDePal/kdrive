-- Créer les rôles de la base de données
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'kemeto') THEN
    CREATE ROLE kemeto WITH LOGIN PASSWORD 'kemeto_password';
  END IF;

  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'pacsman') THEN
    CREATE ROLE pacsman WITH LOGIN PASSWORD 'pacsman_password';
  END IF;
END
$$;

-- Créer le schéma kemet s'il n'existe pas
CREATE SCHEMA IF NOT EXISTS kemet;

-- Donner les privilèges appropriés
GRANT ALL PRIVILEGES ON SCHEMA kemet TO kemeto;
GRANT USAGE ON SCHEMA kemet TO pacsman;

-- Définir le rôle à utiliser pour les opérations suivantes
SET ROLE kemeto;

-- Table des utilisateurs
CREATE TABLE IF NOT EXISTS kemet.users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table des dossiers
CREATE TABLE IF NOT EXISTS kemet.folders (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    parent_id INTEGER REFERENCES kemet.folders(id) ON DELETE CASCADE,
    owner_id INTEGER NOT NULL REFERENCES kemet.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table des fichiers
CREATE TABLE IF NOT EXISTS kemet.files (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    folder_id INTEGER NOT NULL REFERENCES kemet.folders(id) ON DELETE CASCADE,
    owner_id INTEGER NOT NULL REFERENCES kemet.users(id) ON DELETE CASCADE,
    type VARCHAR(100) NOT NULL,
    size BIGINT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table des versions de fichiers
CREATE TABLE IF NOT EXISTS kemet.file_versions (
    id SERIAL PRIMARY KEY,
    file_id INTEGER NOT NULL REFERENCES kemet.files(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    content BYTEA NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (file_id, version_number)
);
-- Si la table shares n'existe pas encore, la créer
CREATE TABLE IF NOT EXISTS kemet.shares (
    id SERIAL PRIMARY KEY,
    sharer_id INTEGER NOT NULL REFERENCES kemet.users(id) ON DELETE CASCADE,
    sharee_email VARCHAR(255) NOT NULL,
    file_id INTEGER NOT NULL REFERENCES kemet.files(id) ON DELETE CASCADE,
    permission VARCHAR(10) NOT NULL CHECK (permission IN ('read', 'write')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Procédure pour créer un partage
CREATE OR REPLACE FUNCTION kemet.create_share(
    p_sharer_id INTEGER,
    p_sharee_email VARCHAR,
    p_file_id INTEGER,
    p_permission VARCHAR
) RETURNS TABLE (share_id INTEGER) AS $$
DECLARE
    v_share_id INTEGER;
BEGIN
    -- Vérifier si le fichier existe et appartient au partageur
    IF NOT EXISTS (
        SELECT 1 FROM kemet.files
        WHERE id = p_file_id AND owner_id = p_sharer_id
    ) THEN
        RAISE EXCEPTION 'Fichier introuvable ou vous n''êtes pas autorisé à le partager';
    END IF;

    -- Créer le partage
    INSERT INTO kemet.shares (sharer_id, sharee_email, file_id, permission)
    VALUES (p_sharer_id, p_sharee_email, p_file_id, p_permission)
    RETURNING id INTO v_share_id;

    RETURN QUERY SELECT v_share_id;
END;
$$ LANGUAGE plpgsql;

-- Procédure pour vérifier la propriété d'un fichier
CREATE OR REPLACE FUNCTION kemet.check_file_ownership(
    p_file_id INTEGER,
    p_user_id INTEGER
) RETURNS TABLE (exists BOOLEAN) AS $$
BEGIN
    RETURN QUERY
    SELECT EXISTS (
        SELECT 1 FROM kemet.files
        WHERE id = p_file_id AND owner_id = p_user_id
    );
END;
$$ LANGUAGE plpgsql;

-- Procédure pour lister les partages d'un utilisateur (en tant que partageur ou destinataire)
CREATE OR REPLACE FUNCTION kemet.list_user_shares(
    p_user_id INTEGER
) RETURNS TABLE (
    id INTEGER,
    file_id INTEGER,
    file_name VARCHAR,
    sharer_email VARCHAR,
    sharee_email VARCHAR,
    permission VARCHAR,
    created_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    -- Partages où l'utilisateur est le partageur
    SELECT s.id, s.file_id, f.name AS file_name, 
           u1.email AS sharer_email, s.sharee_email, 
           s.permission, s.created_at
    FROM kemet.shares s
    JOIN kemet.files f ON s.file_id = f.id
    JOIN kemet.users u1 ON s.sharer_id = u1.id
    WHERE s.sharer_id = p_user_id
    
    UNION
    
    -- Partages où l'utilisateur est le destinataire
    SELECT s.id, s.file_id, f.name AS file_name, 
           u1.email AS sharer_email, s.sharee_email, 
           s.permission, s.created_at
    FROM kemet.shares s
    JOIN kemet.files f ON s.file_id = f.id
    JOIN kemet.users u1 ON s.sharer_id = u1.id
    JOIN kemet.users u2 ON u2.email = s.sharee_email
    WHERE u2.id = p_user_id
    
    ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql;
-- Procédure stockée pour créer un utilisateur
CREATE OR REPLACE FUNCTION kemet.create_user(
    p_email VARCHAR(255),
    p_password_hash VARCHAR(255)
) RETURNS TABLE (user_id INTEGER) AS $$
DECLARE
    v_user_id INTEGER;
BEGIN
    INSERT INTO kemet.users (email, password_hash)
    VALUES (p_email, p_password_hash)
    RETURNING id INTO v_user_id;
    
    RETURN QUERY SELECT v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Procédure stockée pour récupérer un utilisateur par email
CREATE OR REPLACE FUNCTION kemet.get_user_by_email(
    p_email VARCHAR(255)
) RETURNS TABLE (
    id INTEGER,
    email VARCHAR(255),
    password_hash VARCHAR(255)
) AS $$
BEGIN
    RETURN QUERY
    SELECT u.id, u.email, u.password_hash
    FROM kemet.users u
    WHERE u.email = p_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Procédure stockée pour créer un dossier
CREATE OR REPLACE FUNCTION kemet.create_folder(
    p_name VARCHAR(255),
    p_parent_id INTEGER,
    p_owner_id INTEGER
) RETURNS TABLE (folder_id INTEGER) AS $$
DECLARE
    v_folder_id INTEGER;
BEGIN
    -- Vérifier si le dossier parent existe et appartient à l'utilisateur (si parent_id est spécifié)
    IF p_parent_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM kemet.folders 
            WHERE id = p_parent_id AND owner_id = p_owner_id
        ) THEN
            RAISE EXCEPTION 'Dossier parent introuvable ou non autorisé';
        END IF;
    END IF;

    -- Insérer le nouveau dossier
    INSERT INTO kemet.folders (name, parent_id, owner_id)
    VALUES (p_name, p_parent_id, p_owner_id)
    RETURNING id INTO v_folder_id;
    
    RETURN QUERY SELECT v_folder_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Procédure stockée pour récupérer un dossier par son ID
CREATE OR REPLACE FUNCTION kemet.get_folder_by_id(
    p_folder_id INTEGER,
    p_owner_id INTEGER
) RETURNS TABLE (
    id INTEGER,
    name VARCHAR(255),
    parent_id INTEGER,
    owner_id INTEGER,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT f.id, f.name, f.parent_id, f.owner_id, f.created_at, f.updated_at
    FROM kemet.folders f
    WHERE f.id = p_folder_id AND f.owner_id = p_owner_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Procédure stockée pour lister les sous-dossiers d'un dossier
CREATE OR REPLACE FUNCTION kemet.list_subfolders(
    p_parent_id INTEGER,
    p_owner_id INTEGER
) RETURNS TABLE (
    id INTEGER,
    name VARCHAR(255),
    parent_id INTEGER,
    owner_id INTEGER,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT f.id, f.name, f.parent_id, f.owner_id, f.created_at, f.updated_at
    FROM kemet.folders f
    WHERE 
        f.parent_id = p_parent_id AND 
        f.owner_id = p_owner_id
    ORDER BY f.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Procédure stockée pour lister les dossiers racines d'un utilisateur
CREATE OR REPLACE FUNCTION kemet.list_root_folders(
    p_owner_id INTEGER
) RETURNS TABLE (
    id INTEGER,
    name VARCHAR(255),
    parent_id INTEGER,
    owner_id INTEGER,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT f.id, f.name, f.parent_id, f.owner_id, f.created_at, f.updated_at
    FROM kemet.folders f
    WHERE 
        f.parent_id IS NULL AND 
        f.owner_id = p_owner_id
    ORDER BY f.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Procédure stockée pour créer un fichier (métadonnées uniquement)
CREATE OR REPLACE FUNCTION kemet.create_file(
    p_name VARCHAR(255),
    p_folder_id INTEGER,
    p_owner_id INTEGER,
    p_type VARCHAR(100)
) RETURNS TABLE (file_id INTEGER) AS $$
DECLARE
    v_file_id INTEGER;
BEGIN
    -- Vérifier si le dossier existe et appartient à l'utilisateur
    IF NOT EXISTS (
        SELECT 1 FROM kemet.folders 
        WHERE id = p_folder_id AND owner_id = p_owner_id
    ) THEN
        RAISE EXCEPTION 'Dossier introuvable ou non autorisé';
    END IF;

    -- Insérer le nouveau fichier
    INSERT INTO kemet.files (name, folder_id, owner_id, type)
    VALUES (p_name, p_folder_id, p_owner_id, p_type)
    RETURNING id INTO v_file_id;
    
    RETURN QUERY SELECT v_file_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Procédure stockée pour récupérer un fichier par son ID
CREATE OR REPLACE FUNCTION kemet.get_file_by_id(
    p_file_id INTEGER,
    p_owner_id INTEGER
) RETURNS TABLE (
    id INTEGER,
    name VARCHAR(255),
    folder_id INTEGER,
    owner_id INTEGER,
    type VARCHAR(100),
    size BIGINT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT f.id, f.name, f.folder_id, f.owner_id, f.type, f.size, f.created_at, f.updated_at
    FROM kemet.files f
    WHERE f.id = p_file_id AND f.owner_id = p_owner_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Procédure stockée pour lister les fichiers dans un dossier
CREATE OR REPLACE FUNCTION kemet.list_files_in_folder(
    p_folder_id INTEGER,
    p_owner_id INTEGER
) RETURNS TABLE (
    id INTEGER,
    name VARCHAR(255),
    folder_id INTEGER,
    owner_id INTEGER,
    type VARCHAR(100),
    size BIGINT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT f.id, f.name, f.folder_id, f.owner_id, f.type, f.size, f.created_at, f.updated_at
    FROM kemet.files f
    WHERE 
        f.folder_id = p_folder_id AND 
        f.owner_id = p_owner_id
    ORDER BY f.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Procédure stockée pour créer une nouvelle version de fichier
CREATE OR REPLACE FUNCTION kemet.create_file_version(
    p_file_id INTEGER,
    p_content BYTEA,
    p_owner_id INTEGER
) RETURNS TABLE (version_id INTEGER, version_number INTEGER) AS $$
DECLARE
    v_version_id INTEGER;
    v_version_number INTEGER;
    v_file_size BIGINT;
BEGIN
    -- Vérifier si le fichier existe et appartient à l'utilisateur
    IF NOT EXISTS (
        SELECT 1 FROM kemet.files 
        WHERE id = p_file_id AND owner_id = p_owner_id
    ) THEN
        RAISE EXCEPTION 'Fichier introuvable ou non autorisé';
    END IF;

    -- Déterminer le numéro de version
    SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_version_number
    FROM kemet.file_versions
    WHERE file_id = p_file_id;

    -- Calculer la taille du fichier
    v_file_size := octet_length(p_content);

    -- Insérer la nouvelle version
    INSERT INTO kemet.file_versions (file_id, version_number, content)
    VALUES (p_file_id, v_version_number, p_content)
    RETURNING id INTO v_version_id;

    -- Mettre à jour la taille et la date de mise à jour du fichier
    UPDATE kemet.files
    SET size = v_file_size, updated_at = CURRENT_TIMESTAMP
    WHERE id = p_file_id;
    
    RETURN QUERY SELECT v_version_id, v_version_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Procédure stockée pour récupérer les métadonnées des versions d'un fichier
CREATE OR REPLACE FUNCTION kemet.get_file_versions(
    p_file_id INTEGER,
    p_owner_id INTEGER
) RETURNS TABLE (
    id INTEGER,
    file_id INTEGER,
    version_number INTEGER,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    -- Vérifier si le fichier existe et appartient à l'utilisateur
    IF NOT EXISTS (
        SELECT 1 FROM kemet.files 
        WHERE id = p_file_id AND owner_id = p_owner_id
    ) THEN
        RAISE EXCEPTION 'Fichier introuvable ou non autorisé';
    END IF;

    RETURN QUERY
    SELECT fv.id, fv.file_id, fv.version_number, fv.created_at
    FROM kemet.file_versions fv
    WHERE fv.file_id = p_file_id
    ORDER BY fv.version_number DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Procédure stockée pour récupérer le contenu de la dernière version d'un fichier
CREATE OR REPLACE FUNCTION kemet.get_latest_file_content(
    p_file_id INTEGER,
    p_owner_id INTEGER
) RETURNS TABLE (
    file_id INTEGER,
    version_number INTEGER,
    content BYTEA
) AS $$
BEGIN
    -- Vérifier si le fichier existe et appartient à l'utilisateur
    IF NOT EXISTS (
        SELECT 1 FROM kemet.files 
        WHERE id = p_file_id AND owner_id = p_owner_id
    ) THEN
        RAISE EXCEPTION 'Fichier introuvable ou non autorisé';
    END IF;

    RETURN QUERY
    SELECT fv.file_id, fv.version_number, fv.content
    FROM kemet.file_versions fv
    WHERE fv.file_id = p_file_id
    ORDER BY fv.version_number DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Procédure stockée pour récupérer le contenu d'une version spécifique d'un fichier
CREATE OR REPLACE FUNCTION kemet.get_specific_file_version_content(
    p_file_id INTEGER,
    p_version_id INTEGER,
    p_user_id INTEGER
) RETURNS TABLE (
    file_id INTEGER,
    version_number INTEGER,
    content BYTEA,
    file_name VARCHAR(255),
    file_type VARCHAR(100)
) AS $$
BEGIN
    -- Vérifier si le fichier existe et appartient à l'utilisateur ou est partagé avec lui
    IF NOT EXISTS (
        SELECT 1 FROM kemet.files f
        WHERE f.id = p_file_id AND (
            f.owner_id = p_user_id
            OR EXISTS (
                SELECT 1 FROM kemet.shares s
                JOIN kemet.users u ON s.sharee_email = u.email
                WHERE s.file_id = p_file_id AND u.id = p_user_id
            )
        )
    ) THEN
        RAISE EXCEPTION 'Fichier introuvable ou non autorisé';
    END IF;

    RETURN QUERY
    SELECT fv.file_id, fv.version_number, fv.content, f.name AS file_name, f.type AS file_type
    FROM kemet.file_versions fv
    JOIN kemet.files f ON fv.file_id = f.id
    WHERE fv.file_id = p_file_id AND fv.id = p_version_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Procédure stockée pour restaurer une ancienne version d'un fichier
CREATE OR REPLACE FUNCTION kemet.restore_file_version(
    p_file_id INTEGER,
    p_version_id INTEGER,
    p_user_id INTEGER
) RETURNS TABLE (
    new_version_id INTEGER,
    new_version_number INTEGER
) AS $$
DECLARE
    v_content BYTEA;
    v_new_version_id INTEGER;
    v_new_version_number INTEGER;
BEGIN
    -- Vérifier si le fichier existe et appartient à l'utilisateur
    IF NOT EXISTS (
        SELECT 1 FROM kemet.files 
        WHERE id = p_file_id AND owner_id = p_user_id
    ) THEN
        RAISE EXCEPTION 'Fichier introuvable ou non autorisé';
    END IF;

    -- Vérifier si la version spécifiée existe pour ce fichier
    IF NOT EXISTS (
        SELECT 1 FROM kemet.file_versions
        WHERE file_id = p_file_id AND id = p_version_id
    ) THEN
        RAISE EXCEPTION 'Version de fichier introuvable';
    END IF;

    -- Récupérer le contenu de la version à restaurer
    SELECT content INTO v_content
    FROM kemet.file_versions
    WHERE id = p_version_id;

    -- Créer une nouvelle version avec le contenu de l'ancienne
    SELECT * INTO v_new_version_id, v_new_version_number
    FROM kemet.create_file_version(p_file_id, v_content, p_user_id);

    RETURN QUERY SELECT v_new_version_id, v_new_version_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Procédure stockée pour comparer deux versions d'un fichier (métadonnées uniquement)
CREATE OR REPLACE FUNCTION kemet.compare_file_versions(
    p_file_id INTEGER,
    p_version_id_1 INTEGER,
    p_version_id_2 INTEGER,
    p_user_id INTEGER
) RETURNS TABLE (
    file_id INTEGER,
    version_1_id INTEGER,
    version_1_number INTEGER,
    version_1_date TIMESTAMP WITH TIME ZONE,
    version_2_id INTEGER,
    version_2_number INTEGER,
    version_2_date TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    -- Vérifier si le fichier existe et appartient à l'utilisateur
    IF NOT EXISTS (
        SELECT 1 FROM kemet.files 
        WHERE id = p_file_id AND (
            owner_id = p_user_id
            OR EXISTS (
                SELECT 1 FROM kemet.shares s
                JOIN kemet.users u ON s.sharee_email = u.email
                WHERE s.file_id = p_file_id AND u.id = p_user_id
            )
        )
    ) THEN
        RAISE EXCEPTION 'Fichier introuvable ou non autorisé';
    END IF;

    RETURN QUERY
    SELECT 
        p_file_id AS file_id,
        v1.id AS version_1_id,
        v1.version_number AS version_1_number,
        v1.created_at AS version_1_date,
        v2.id AS version_2_id,
        v2.version_number AS version_2_number,
        v2.created_at AS version_2_date
    FROM 
        kemet.file_versions v1,
        kemet.file_versions v2
    WHERE 
        v1.id = p_version_id_1 AND
        v2.id = p_version_id_2 AND
        v1.file_id = p_file_id AND
        v2.file_id = p_file_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Accorder des privilèges d'exécution à pacsman
GRANT EXECUTE ON FUNCTION kemet.create_user(VARCHAR, VARCHAR) TO pacsman;
GRANT EXECUTE ON FUNCTION kemet.get_user_by_email(VARCHAR) TO pacsman;
GRANT EXECUTE ON FUNCTION kemet.create_folder(VARCHAR, INTEGER, INTEGER) TO pacsman;
GRANT EXECUTE ON FUNCTION kemet.get_folder_by_id(INTEGER, INTEGER) TO pacsman;
GRANT EXECUTE ON FUNCTION kemet.list_subfolders(INTEGER, INTEGER) TO pacsman;
GRANT EXECUTE ON FUNCTION kemet.list_root_folders(INTEGER) TO pacsman;
GRANT EXECUTE ON FUNCTION kemet.create_file(VARCHAR, INTEGER, INTEGER, VARCHAR) TO pacsman;
GRANT EXECUTE ON FUNCTION kemet.get_file_by_id(INTEGER, INTEGER) TO pacsman;
GRANT EXECUTE ON FUNCTION kemet.list_files_in_folder(INTEGER, INTEGER) TO pacsman;
GRANT EXECUTE ON FUNCTION kemet.create_file_version(INTEGER, BYTEA, INTEGER) TO pacsman;
GRANT EXECUTE ON FUNCTION kemet.get_file_versions(INTEGER, INTEGER) TO pacsman;
GRANT EXECUTE ON FUNCTION kemet.get_latest_file_content(INTEGER, INTEGER) TO pacsman;
GRANT EXECUTE ON FUNCTION kemet.get_specific_file_version_content(INTEGER, INTEGER, INTEGER) TO pacsman;
GRANT EXECUTE ON FUNCTION kemet.restore_file_version(INTEGER, INTEGER, INTEGER) TO pacsman;
GRANT EXECUTE ON FUNCTION kemet.compare_file_versions(INTEGER, INTEGER, INTEGER, INTEGER) TO pacsman;

-- Revenir au rôle par défaut
RESET ROLE;
