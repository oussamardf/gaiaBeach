-- ════════════════════════════════════════════════════════════════════════════
--  Droits sur le menu (familles + articles)
--  • tout utilisateur connecté peut LIRE le menu (caisse)
--  • seuls les admins (profiles.role = 'admin') peuvent AJOUTER / MODIFIER / SUPPRIMER
--  À exécuter UNE FOIS dans Supabase → SQL Editor → Run
-- ════════════════════════════════════════════════════════════════════════════

-- ── familles ────────────────────────────────────────────────────────────────
ALTER TABLE public.familles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "familles_select_connectes" ON public.familles;
DROP POLICY IF EXISTS "familles_insert_admin"     ON public.familles;
DROP POLICY IF EXISTS "familles_update_admin"     ON public.familles;
DROP POLICY IF EXISTS "familles_delete_admin"     ON public.familles;

CREATE POLICY "familles_select_connectes" ON public.familles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "familles_insert_admin" ON public.familles
  FOR INSERT TO authenticated WITH CHECK (public.mon_role() = 'admin');

CREATE POLICY "familles_update_admin" ON public.familles
  FOR UPDATE TO authenticated
  USING (public.mon_role() = 'admin')
  WITH CHECK (public.mon_role() = 'admin');

CREATE POLICY "familles_delete_admin" ON public.familles
  FOR DELETE TO authenticated USING (public.mon_role() = 'admin');

-- ── articles ────────────────────────────────────────────────────────────────
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "articles_select_connectes" ON public.articles;
DROP POLICY IF EXISTS "articles_insert_admin"     ON public.articles;
DROP POLICY IF EXISTS "articles_update_admin"     ON public.articles;
DROP POLICY IF EXISTS "articles_delete_admin"     ON public.articles;

CREATE POLICY "articles_select_connectes" ON public.articles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "articles_insert_admin" ON public.articles
  FOR INSERT TO authenticated WITH CHECK (public.mon_role() = 'admin');

CREATE POLICY "articles_update_admin" ON public.articles
  FOR UPDATE TO authenticated
  USING (public.mon_role() = 'admin')
  WITH CHECK (public.mon_role() = 'admin');

CREATE POLICY "articles_delete_admin" ON public.articles
  FOR DELETE TO authenticated USING (public.mon_role() = 'admin');

-- Vérification : votre compte doit apparaître avec role = admin
SELECT id, email, role FROM public.profiles ORDER BY role, email;
