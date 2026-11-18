import React from "react";
import type { CartItem } from "@/store/useCartStore";

/*
 * Ticket « Calculer la caisse / ARTICLE VENDUS » — reproduction du ticket Pointex
 * de LA GAZELLE DE BABYLONE.
 *
 * Toutes les cotes sont en millimètres et en styles inline : l'aperçu écran et
 * l'impression (popup) utilisent exactement le même rendu, sans dépendre de Tailwind.
 * Cotes mesurées sur le ticket original (papier 80 mm).
 */

// ── Cotes (mm) ───────────────────────────────────────────────────────────────
export const T = {
  paper: 80, // largeur du papier
  marginLeft: 4.2, // marge gauche du texte (mesurée : 4,2 mm)
  content: 65.95, // largeur utile = bord droit du bloc noir
  font: 2.3, // corps du texte (≈ 6,5 pt)
  dotFont: 2.15, // corps des points de suite (pas mesuré : 0,60 mm)
  line: 2.7, // interligne (mesuré : 2,68 mm)
  gapNet: 2.3, // blanc avant le bloc « Net CATÉGORIE »
  gapCat: 1.95, // blanc avant une nouvelle catégorie
  blockStart: 40.2, // début du bloc noir (qté + prix)
  qtyRight: 49.75, // bord droit de la colonne quantité (mesuré : 49,6–49,9)
  priceRight: 65.9, // bord droit de la colonne prix
  dotsEnd: 40.0, // fin des pointillés
  gapFooter: 2.75, // blanc avant la ligne de pied Pointex
  footerClip: 52.4, // le texte du pied est coupé à 52,4 mm (comme l'original)
  // Retraits (depuis le bord gauche du texte)
  indSub: 2.8, // « Ventes »
  indItem: 5.5, // articles
  indNet: 2.65, // « Net Ventes »
  indDont: 3.3, // « dont Ventes »
  indCatDont: 1.1, // « dont Ventes » sous « Net CATÉGORIE »
} as const;

const mm = (v: number) => `${v}mm`;
const FONT = "Arial, Helvetica, sans-serif";

/** Format Pointex : 2 décimales, virgule */
export const fmt = (n: number) => n.toFixed(2).replace(".", ",");

const DOTS = ".".repeat(200);

const rowBase: React.CSSProperties = {
  position: "relative",
  height: mm(T.line),
  lineHeight: mm(T.line),
  whiteSpace: "nowrap",
};

/** Colonnes qté / prix positionnées en absolu (aucun décalage possible) */
function Nums({ qty, price, invert }: { qty: string; price: string; invert?: boolean }) {
  return (
    <>
      {invert && (
        <span
          style={{
            position: "absolute",
            left: mm(T.blockStart),
            width: mm(T.content - T.blockStart),
            top: 0,
            bottom: 0,
            backgroundColor: "#000",
          }}
        />
      )}
      <span
        style={{
          position: "absolute",
          right: mm(T.content - T.qtyRight),
          top: 0,
          color: invert ? "#fff" : "#000",
          fontWeight: invert ? "bold" : "normal",
        }}
      >
        {qty}
      </span>
      <span
        style={{
          position: "absolute",
          right: mm(T.content - T.priceRight),
          top: 0,
          color: invert ? "#fff" : "#000",
          fontWeight: invert ? "bold" : "normal",
        }}
      >
        {price}
      </span>
    </>
  );
}

/** Ligne de total : libellé + pointillés + bloc noir */
function SummaryLine({
  label,
  qty,
  price,
  indent,
  invert = true,
}: {
  label: string;
  qty: string;
  price: string;
  indent: number;
  /** false = chiffres sans bloc noir (totaux « Global » du bas de ticket) */
  invert?: boolean;
}) {
  return (
    <div style={rowBase}>
      <span
        style={{
          position: "absolute",
          left: mm(indent),
          width: mm(T.dotsEnd - indent),
          top: 0,
          overflow: "hidden",
        }}
      >
        {label}
        {"\u00a0\u00a0"}
        <span style={{ fontSize: mm(T.dotFont) }}>{DOTS}</span>
      </span>
      <Nums qty={qty} price={price} invert={invert} />
    </div>
  );
}

/** Ligne article : nom en majuscules + qté/prix (non inversés) */
function ItemLine({ name, qty, price }: { name: string; qty: string; price: string }) {
  return (
    <div style={rowBase}>
      <span
        style={{
          position: "absolute",
          left: mm(T.indItem),
          width: mm(41 - T.indItem),
          top: 0,
          overflow: "hidden",
          textTransform: "uppercase",
        }}
      >
        {name}
      </span>
      <Nums qty={qty} price={price} />
    </div>
  );
}

function Heading({ text, indent, small }: { text: string; indent: number; small?: boolean }) {
  return (
    <div style={rowBase}>
      <span
        style={{
          position: "absolute",
          left: mm(indent),
          top: 0,
          textDecoration: "underline",
          textDecorationThickness: "0.25mm",
          textUnderlineOffset: "0.12mm", // soulignement collé au texte (mesuré)
          fontWeight: "normal",
          fontSize: small ? mm(1.95) : undefined,
          textTransform: small ? "uppercase" : undefined,
        }}
      >
        {text}
      </span>
    </div>
  );
}

interface Props {
  items: CartItem[];
  /** Date/heure réelle d'impression (pied de ticket) */
  date: Date;
  /** Date de la caisse affichée dans l'en-tête (« Calculer la caisse du … ») */
  caisseDate?: Date;
  /** Contrôles écran (+/−/supprimer) sous chaque article — jamais imprimés */
  renderItemControls?: (item: CartItem) => React.ReactNode;
}

const TicketPointex = React.forwardRef<HTMLDivElement, Props>(
  ({ items, date, caisseDate, renderItemControls }, ref) => {
    const caisseStr = (caisseDate ?? date).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    const timeStr = date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

    // Regroupement par famille (ordre d'ajout)
    const groups: [string, CartItem[]][] = [];
    for (const it of items) {
      const g = groups.find(([k]) => k === it.famille_nom);
      if (g) g[1].push(it);
      else groups.push([it.famille_nom, [it]]);
    }

    const total = items.reduce((s, i) => s + i.prix_unitaire * i.quantite, 0);
    const totalQty = items.reduce((s, i) => s + i.quantite, 0);
    // « dimanche 16 novembre 2026 à 14:00 » (coupé à l'impression comme l'original)
    const printedLong = `${date.toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    })} à ${timeStr}`;

    return (
      <div
        ref={ref}
        className="ticket-pointex"
        style={{
          width: mm(T.paper),
          boxSizing: "border-box",
          padding: `${mm(2)} 0 ${mm(8)} ${mm(T.marginLeft)}`,
          backgroundColor: "#fff",
          color: "#000",
          fontFamily: FONT,
          fontSize: mm(T.font),
          fontWeight: "normal",
          lineHeight: mm(T.line),
        }}
      >
        <div style={{ width: mm(T.content) }}>
          {/* ── En-tête ─────────────────────────────────────────────
              Interlignes réglés sur les lignes de base mesurées :
              titre → date 4,2 mm · date → ARTICLE 4,1 mm ·
              ARTICLE → pointillé 2,2 mm · ARTICLE → 1re ligne 4,2 mm */}
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                fontSize: mm(3.8),
                lineHeight: mm(4.2),
                fontWeight: "bold",
                textDecoration: "underline",
                textDecorationThickness: "0.35mm",
                textUnderlineOffset: "0.55mm",
              }}
            >
              LA GAZELLE DE BABYLONE
            </div>
            <div style={{ fontSize: mm(3.8), lineHeight: mm(4.2) }}>
              Calculer la caisse du {caisseStr}
            </div>
            <div style={{ fontSize: mm(3.5), lineHeight: mm(4.2), fontWeight: "bold" }}>
              ARTICLE VENDUS
            </div>
          </div>
          {/* Fine ligne pointillée sous l'en-tête (pleine largeur du texte) */}
          <div
            style={{
              marginTop: mm(1.31),
              marginBottom: mm(1.8),
              height: mm(0.2),
              backgroundImage:
                "repeating-linear-gradient(to right, #000 0, #000 0.2mm, transparent 0.2mm, transparent 0.5mm)",
            }}
          />

          {items.length === 0 ? (
            <div style={{ textAlign: "center", padding: "10mm 0", color: "#999" }} className="no-print">
              — ticket vide —
            </div>
          ) : (
            <>
              {groups.map(([famille, famItems], gi) => {
                const cat = famille.toUpperCase();
                const q = fmt(famItems.reduce((s, i) => s + i.quantite, 0));
                const p = fmt(famItems.reduce((s, i) => s + i.prix_unitaire * i.quantite, 0));
                return (
                  <div key={famille} style={{ marginTop: gi === 0 ? 0 : mm(T.gapCat) }}>
                    <Heading text={cat} indent={0} small />
                    <Heading text="Ventes" indent={T.indSub} />
                    {famItems.map((item) => (
                      <React.Fragment key={item.id}>
                        <ItemLine
                          name={item.nom}
                          qty={fmt(item.quantite)}
                          price={fmt(item.prix_unitaire * item.quantite)}
                        />
                        {renderItemControls && (
                          <div className="no-print">{renderItemControls(item)}</div>
                        )}
                      </React.Fragment>
                    ))}
                    <SummaryLine label="Net Ventes" qty={q} price={p} indent={T.indNet} />
                    <SummaryLine label="dont Ventes" qty={q} price={p} indent={T.indDont} />

                    <div style={{ marginTop: mm(T.gapNet) }}>
                      <SummaryLine label={`Net ${cat}`} qty={q} price={p} indent={0} />
                      <SummaryLine label="dont Ventes" qty={q} price={p} indent={T.indCatDont} />
                    </div>
                  </div>
                );
              })}

              {/* ── Totaux « Global » (chiffres normaux, sans bloc noir) ─── */}
              <div style={{ marginTop: mm(T.gapNet) }}>
                {/* Mêmes 6 lignes que l'original. Offerts / Remises / Annulations
                    à 0,00 tant que la caisse ne les enregistre pas. */}
                {[
                  { label: "Net Global", q: totalQty, p: total, ind: 0 },
                  { label: "Brut Global", q: totalQty, p: total, ind: 0 },
                  { label: "dont Ventes", q: totalQty, p: total, ind: T.indCatDont },
                  { label: "dont Offerts", q: 0, p: 0, ind: T.indCatDont },
                  { label: "dont Remises", q: 0, p: 0, ind: T.indCatDont },
                  { label: "Annulations Global", q: 0, p: 0, ind: 0 },
                ].map((l) => (
                  <SummaryLine
                    key={l.label}
                    label={l.label}
                    qty={fmt(l.q)}
                    price={fmt(l.p)}
                    indent={l.ind}
                    invert={false}
                  />
                ))}
              </div>

              {/* ── Pied Pointex : texte coupé à 52,4 mm + « Page: 1 » à droite ── */}
              <div style={{ ...rowBase, marginTop: mm(T.gapFooter) }}>
                <span
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    width: mm(T.footerClip),
                    overflow: "hidden",
                  }}
                >
                  Pointex CHR - (C)POINTEX - Imprimé le {printedLong}
                </span>
                <span style={{ position: "absolute", right: mm(T.content - T.priceRight), top: 0 }}>
                  Page: 1
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }
);

TicketPointex.displayName = "TicketPointex";

export default TicketPointex;
