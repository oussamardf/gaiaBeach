-- ════════════════════════════════════════════════════════════════════════════
--  Corrige : new row violates row-level security policy for table "commandes"
--  • commandes       : admin = tout ; caisse = uniquement son agence
--  • lignes_commande : suivent la règle de leur commande
--  À exécuter UNE FOIS dans Supabase → SQL Editor → Run
-- ════════════════════════════════════════════════════════════════════════════

-- 1) Fonctions utilisées par les règles (lisent public.profiles)
CREATE OR REPLACE FUNCTION public.mon_role()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT role::text FROM public.profiles WHERE id = auth.uid() $$;

CREATE OR REPLACE FUNCTION public.mon_agence()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT agence FROM public.profiles WHERE id = auth.uid() $$;

-- 2) commandes
ALTER TABLE public.commandes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "commandes_select_multi_agence" ON public.commandes;
DROP POLICY IF EXISTS "commandes_insert_multi_agence" ON public.commandes;
DROP POLICY IF EXISTS "commandes_update_multi_agence" ON public.commandes;
DROP POLICY IF EXISTS "commandes_delete_multi_agence" ON public.commandes;

CREATE POLICY "commandes_select_multi_agence" ON public.commandes
  FOR SELECT TO authenticated
  USING (public.mon_role() = 'admin' OR agence = public.mon_agence());

CREATE POLICY "commandes_insert_multi_agence" ON public.commandes
  FOR INSERT TO authenticated
  WITH CHECK (public.mon_role() = 'admin' OR agence = public.mon_agence());

CREATE POLICY "commandes_update_multi_agence" ON public.commandes
  FOR UPDATE TO authenticated
  USING (public.mon_role() = 'admin' OR agence = public.mon_agence())
  WITH CHECK (public.mon_role() = 'admin' OR agence = public.mon_agence());

CREATE POLICY "commandes_delete_multi_agence" ON public.commandes
  FOR DELETE TO authenticated
  USING (public.mon_role() = 'admin' OR agence = public.mon_agence());

-- 3) lignes_commande : autorisées si la commande parente est autorisée
ALTER TABLE public.lignes_commande ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lignes_select_via_commande" ON public.lignes_commande;
DROP POLICY IF EXISTS "lignes_insert_via_commande" ON public.lignes_commande;
DROP POLICY IF EXISTS "lignes_update_via_commande" ON public.lignes_commande;
DROP POLICY IF EXISTS "lignes_delete_via_commande" ON public.lignes_commande;

CREATE POLICY "lignes_select_via_commande" ON public.lignes_commande
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.commandes c WHERE c.id = commande_id
                 AND (public.mon_role() = 'admin' OR c.agence = public.mon_agence())));

CREATE POLICY "lignes_insert_via_commande" ON public.lignes_commande
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.commandes c WHERE c.id = commande_id
                      AND (public.mon_role() = 'admin' OR c.agence = public.mon_agence())));

CREATE POLICY "lignes_update_via_commande" ON public.lignes_commande
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.commandes c WHERE c.id = commande_id
                 AND (public.mon_role() = 'admin' OR c.agence = public.mon_agence())));

CREATE POLICY "lignes_delete_via_commande" ON public.lignes_commande
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.commandes c WHERE c.id = commande_id
                 AND (public.mon_role() = 'admin' OR c.agence = public.mon_agence())));

-- 4) Profils manquants : chaque compte de connexion doit avoir une ligne profiles
INSERT INTO public.profiles (id, email, role, agence)
SELECT u.id, COALESCE(u.email, ''), 'caisse'::public.role_utilisateur, 'Casablanca'
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

-- 5) Vérification : chaque compte avec son rôle et son agence
SELECT email, role, agence FROM public.profiles ORDER BY role, email;
