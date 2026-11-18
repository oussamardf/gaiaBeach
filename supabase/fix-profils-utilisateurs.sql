-- Fix: relation "public.profils_utilisateurs" does not exist
-- Cause: un trigger/fonction Auth pointe encore vers l'ancien nom de table.
-- Table réelle (d'après ton schéma) : public.profiles
--
-- Exécute ce script dans Supabase → SQL Editor.

-- 1) Enum rôle (si absent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'role_utilisateur') THEN
    CREATE TYPE public.role_utilisateur AS ENUM ('caisse', 'admin');
  END IF;
END $$;

-- 2) S'assurer que public.profiles existe (aligné sur ton schéma)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  role public.role_utilisateur NOT NULL DEFAULT 'caisse',
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

-- 3) Supprimer l'ancienne table fantôme si elle a été créée à moitié
DROP TABLE IF EXISTS public.profils_utilisateurs CASCADE;

-- 4) Remplacer la fonction de sync Auth → profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(
      (NEW.raw_user_meta_data->>'role')::public.role_utilisateur,
      'caisse'::public.role_utilisateur
    )
  )
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email;

  RETURN NEW;
END;
$$;

-- 5) Recréer le trigger sur auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 6) Corriger toute autre fonction qui citerait encore profils_utilisateurs
--    (liste les fonctions suspectes pour contrôle)
-- SELECT n.nspname, p.proname
-- FROM pg_proc p
-- JOIN pg_namespace n ON n.oid = p.pronamespace
-- WHERE pg_get_functiondef(p.oid) ILIKE '%profils_utilisateurs%';
