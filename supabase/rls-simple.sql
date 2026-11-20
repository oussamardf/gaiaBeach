-- ════════════════════════════════════════════════════════════════════════════
--  RÈGLES DE SÉCURITÉ SIMPLIFIÉES — fin des erreurs « row-level security »
--
--  Règle unique pour familles, articles, commandes, lignes_commande :
--    ✔ utilisateur CONNECTÉ (login de l'application) → lecture + écriture
--    ✘ visiteur NON connecté                          → aucun accès
--
--  Remplace TOUTES les anciennes règles de ces 4 tables (y compris celles
--  par agence et admin-only). Peut être relancé sans risque.
--  À exécuter dans Supabase → SQL Editor → Run
-- ════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  t   text;
  pol record;
BEGIN
  FOREACH t IN ARRAY ARRAY['familles', 'articles', 'commandes', 'lignes_commande'] LOOP
    -- 1) supprimer toutes les règles existantes de la table
    FOR pol IN
      SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND tablename = t
    LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', pol.policyname, t);
    END LOOP;

    -- 2) sécurité activée + une seule règle : connecté = accès complet
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)',
      t || '_acces_connectes', t
    );

    -- 3) droits SQL de base pour les utilisateurs connectés
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
  END LOOP;
END $$;

-- Droits sur les compteurs d'id (évite « permission denied for sequence »)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Recharge le cache de l'API Supabase
NOTIFY pgrst, 'reload schema';

-- Vérification : une seule règle par table, rôle {authenticated}
SELECT tablename, policyname, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('familles', 'articles', 'commandes', 'lignes_commande')
ORDER BY tablename;
