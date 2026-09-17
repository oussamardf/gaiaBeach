import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "⚠️  Variables Supabase manquantes.\n" +
      "Ajoutez NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY dans .env.local\n" +
      "Puis redémarrez le serveur : npm run dev"
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ─── Database types (matching actual Supabase schema) ────────────────────────

export interface Famille {
  id: number;
  nom: string;
  ordre_affichage: number;
}

export interface Article {
  id: number;
  famille_id: number;
  nom: string;
  prix_unitaire: number;
  est_actif: boolean;
  created_at: string;
}

export interface Commande {
  id: number;
  total_ht: number;
  total_ttc: number;
  mode_paiement: string;
  statut: string;
  created_at: string;
}

export interface LigneCommande {
  id: number;
  commande_id: number;
  article_id: number;
  nom_article_historique: string;
  prix_unitaire_historique: number;
  quantite: number;
  sous_total: number;
}
