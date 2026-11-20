-- ════════════════════════════════════════════════════════════════════════════
--  Corrige : duplicate key value violates unique constraint "familles_pkey"
--  Cause  : le compteur des id (séquence) est en retard sur les id existants
--           (données importées avec leurs id).
--  Effet  : recale chaque compteur sur le plus grand id présent dans la table.
--  Sans risque : ne modifie aucune donnée. Peut être relancé à tout moment.
--  À exécuter dans Supabase → SQL Editor → Run
-- ════════════════════════════════════════════════════════════════════════════

SELECT setval(pg_get_serial_sequence('public.familles', 'id'),
              COALESCE((SELECT MAX(id) FROM public.familles), 0) + 1, false);

SELECT setval(pg_get_serial_sequence('public.articles', 'id'),
              COALESCE((SELECT MAX(id) FROM public.articles), 0) + 1, false);

SELECT setval(pg_get_serial_sequence('public.commandes', 'id'),
              COALESCE((SELECT MAX(id) FROM public.commandes), 0) + 1, false);

SELECT setval(pg_get_serial_sequence('public.lignes_commande', 'id'),
              COALESCE((SELECT MAX(id) FROM public.lignes_commande), 0) + 1, false);

-- Vérification : « prochain_id » doit être plus grand que « max_id » partout
SELECT 'familles' AS table_, (SELECT MAX(id) FROM public.familles) AS max_id,
       (SELECT last_value FROM public.familles_id_seq) AS prochain_id
UNION ALL
SELECT 'articles', (SELECT MAX(id) FROM public.articles),
       (SELECT last_value FROM public.articles_id_seq)
UNION ALL
SELECT 'commandes', (SELECT MAX(id) FROM public.commandes),
       (SELECT last_value FROM public.commandes_id_seq)
UNION ALL
SELECT 'lignes_commande', (SELECT MAX(id) FROM public.lignes_commande),
       (SELECT last_value FROM public.lignes_commande_id_seq);
