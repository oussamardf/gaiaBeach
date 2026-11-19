-- ════════════════════════════════════════════════════════════════════════════
--  Divisions du menu : FOOD / DRINKS / SALON / TRANSAT
--  À exécuter UNE FOIS dans Supabase → SQL Editor → Run
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.familles
  ADD COLUMN IF NOT EXISTS division text;

-- Valeurs autorisées (NULL = famille sans division)
ALTER TABLE public.familles
  DROP CONSTRAINT IF EXISTS familles_division_check;
ALTER TABLE public.familles
  ADD CONSTRAINT familles_division_check
  CHECK (division IS NULL OR division IN ('FOOD', 'DRINKS', 'SALON', 'TRANSAT'));

-- Recharge le cache de l'API Supabase (sinon : « column not found in schema cache »)
NOTIFY pgrst, 'reload schema';

-- Vérification : doit lister vos familles avec la colonne division
SELECT id, nom, division FROM public.familles ORDER BY division NULLS LAST, nom;
