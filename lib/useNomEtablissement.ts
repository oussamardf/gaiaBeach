"use client";

import { useEffect, useState } from "react";

/** Nom imprimé en tête des tickets (ticket de caisse et Bilan total). */
export const NOM_PAR_DEFAUT = "LA GAZELLE DE BABYLONE";
const CLE = "pos-nom-etablissement";

/**
 * Nom de l'établissement, modifiable et mémorisé dans ce navigateur
 * (partagé entre la caisse et la page Bilan).
 */
export function useNomEtablissement() {
  const [nom, setNomState] = useState(NOM_PAR_DEFAUT);

  // Lecture après le montage (évite un écart entre rendu serveur et client)
  useEffect(() => {
    try {
      const v = window.localStorage.getItem(CLE);
      if (v !== null) setNomState(v);
    } catch {
      /* stockage indisponible : on garde le nom par défaut */
    }
  }, []);

  const setNom = (v: string) => {
    setNomState(v);
    try {
      window.localStorage.setItem(CLE, v);
    } catch {
      /* ignoré */
    }
  };

  /** Nom à imprimer : jamais vide */
  const nomImprime = nom.trim() || NOM_PAR_DEFAUT;

  return { nom, setNom, nomImprime, reset: () => setNom(NOM_PAR_DEFAUT) };
}
