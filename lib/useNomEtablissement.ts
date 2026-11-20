"use client";

import { useEffect, useState } from "react";

/** Nom de l'établissement imprimé sous « BILAN TOTAL » (ex. DJADJA AFRO CLUB). */
export const NOM_PAR_DEFAUT = "DJADJA AFRO CLUB";
const CLE = "pos-nom-club";

/**
 * Nom de l'établissement, modifiable et mémorisé dans ce navigateur
 * (page Bilan total).
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
