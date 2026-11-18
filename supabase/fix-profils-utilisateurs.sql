-- Fix: relation "public.profils_utilisateurs" does not exist
-- Cause: mon_role() / mon_agence() (utilisées par RLS commandes) lisent encore l'ancienne table.
-- Table réelle : public.profiles

-- 1) Colonne agence sur profiles (requis par mon_agence + RLS multi-agence)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS agence text NOT NULL DEFAULT 'Casablanca';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_agence_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_agence_check
      CHECK (agence = ANY (ARRAY['Casablanca'::text, 'Agadir'::text]));
  END IF;
END $$;

-- 2) Fonctions helper → profiles
CREATE OR REPLACE FUNCTION public.mon_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT role::text
  FROM public.profiles
  WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.mon_agence()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT agence
  FROM public.profiles
  WHERE id = auth.uid()
$$;

-- 3) Vue de compatibilité si un ancien objet cite encore profils_utilisateurs
CREATE OR REPLACE VIEW public.profils_utilisateurs AS
SELECT id, email, role::text AS role, agence, created_at
FROM public.profiles;

-- 4) RLS commandes : rôles réels = 'admin' / 'caisse' (plus 'Admin' / 'Sous-Admin')
DROP POLICY IF EXISTS "commandes_select_multi_agence" ON public.commandes;
DROP POLICY IF EXISTS "commandes_insert_multi_agence" ON public.commandes;
DROP POLICY IF EXISTS "commandes_update_multi_agence" ON public.commandes;
DROP POLICY IF EXISTS "commandes_delete_multi_agence" ON public.commandes;

CREATE POLICY "commandes_select_multi_agence"
  ON public.commandes
  FOR SELECT
  USING (
    mon_role() = 'admin'
    OR agence = mon_agence()
  );

CREATE POLICY "commandes_insert_multi_agence"
  ON public.commandes
  FOR INSERT
  WITH CHECK (
    mon_role() = 'admin'
    OR agence = mon_agence()
  );

CREATE POLICY "commandes_update_multi_agence"
  ON public.commandes
  FOR UPDATE
  USING (
    mon_role() = 'admin'
    OR agence = mon_agence()
  )
  WITH CHECK (
    mon_role() = 'admin'
    OR agence = mon_agence()
  );

CREATE POLICY "commandes_delete_multi_agence"
  ON public.commandes
  FOR DELETE
  USING (
    mon_role() = 'admin'
    OR agence = mon_agence()
  );

-- 5) Trigger Auth déjà OK sur profiles — on le laisse / renforce
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, agence)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(
      (NEW.raw_user_meta_data->>'role')::public.role_utilisateur,
      'caisse'::public.role_utilisateur
    ),
    COALESCE(NEW.raw_user_meta_data->>'agence', 'Casablanca')
  )
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email;

  RETURN NEW;
END;
$$;
