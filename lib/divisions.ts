/** Divisions du menu, dans l'ordre d'impression sur le ticket. */
export const DIVISIONS = ["FOOD", "DRINKS", "SALON", "TRANSAT"] as const;
export type Division = (typeof DIVISIONS)[number];

/** Libellés affichés dans l'interface */
export const DIVISION_LABELS: Record<Division, string> = {
  FOOD: "Food",
  DRINKS: "Drinks",
  SALON: "Salon",
  TRANSAT: "Transat",
};

/** Rang d'une division pour le tri (sans division → à la fin) */
export const divisionRank = (d: string | null | undefined) => {
  const i = DIVISIONS.indexOf((d ?? "") as Division);
  return i === -1 ? DIVISIONS.length : i;
};
