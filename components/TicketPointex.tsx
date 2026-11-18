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
  marginLeft: 4, // marge gauche du texte
  content: 67, // largeur utile du texte (le reste = marge droite)
  font: 2.3, // corps du texte (≈ 6,5 pt)
  line: 2.8, // interligne
  gap: 1.1, // espace entre deux blocs (Ventes / Net CATÉGORIE…)
  blockStart: 40, // début du bloc noir (qté + prix)
  qtyRight: 50, // bord droit de la colonne quantité
  priceRight: 66.7, // bord droit de la colonne prix
  dotsEnd: 39.4, // fin des pointillés
  // Retraits
  indSub: 2.7, // « Ventes »
  indItem: 5.5, // articles
  indNet: 2.5, // « Net Ventes »
  indDont: 3.3, // « dont Ventes »
  indCatDont: 0.8, // « dont Ventes » sous « Net CATÉGORIE »
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
}: {
  label: string;
  qty: string;
  price: string;
  indent: number;
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
        {label} {DOTS}
      </span>
      <Nums qty={qty} price={price} invert />
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
          width: mm(T.blockStart + 1 - T.indItem),
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
          textUnderlineOffset: "0.35mm",
          fontWeight: small ? "bold" : "normal",
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
  date: Date;
  /** Contrôles écran (+/−/supprimer) sous chaque article — jamais imprimés */
  renderItemControls?: (item: CartItem) => React.ReactNode;
}

const TicketPointex = React.forwardRef<HTMLDivElement, Props>(
  ({ items, date, renderItemControls }, ref) => {
    const dateStr = date.toLocaleDateString("fr-FR", {
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
    const TVA_RATE = 0.1;
    const totalTVA = total * (TVA_RATE / (1 + TVA_RATE));
    const totalHT = total - totalTVA;

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
          {/* ── En-tête ─────────────────────────────────────────────── */}
          <div style={{ textAlign: "center", marginBottom: mm(0.6) }}>
            <div
              style={{
                fontSize: mm(3.8),
                lineHeight: mm(4.6),
                fontWeight: "bold",
                textDecoration: "underline",
                textUnderlineOffset: "0.5mm",
              }}
            >
              LA GAZELLE DE BABYLONE
            </div>
            <div style={{ fontSize: mm(3.85), lineHeight: mm(4.3) }}>
              Calculer la caisse du {dateStr}
            </div>
            <div style={{ fontSize: mm(3.3), lineHeight: mm(4.3), fontWeight: "bold" }}>
              ARTICLE VENDUS
            </div>
          </div>

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
                  <div key={famille} style={{ marginTop: gi === 0 ? 0 : mm(T.gap) }}>
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

                    <div style={{ marginTop: mm(T.gap) }}>
                      <SummaryLine label={`Net ${cat}`} qty={q} price={p} indent={0} />
                      <SummaryLine label="dont Ventes" qty={q} price={p} indent={T.indCatDont} />
                    </div>
                  </div>
                );
              })}

              {/* ── Totaux généraux ──────────────────────────────────── */}
              <div style={{ marginTop: mm(T.gap * 2) }}>
                <SummaryLine label="Net TOTAL" qty={fmt(totalQty)} price={fmt(total)} indent={0} />
                <SummaryLine label="dont Ventes" qty={fmt(totalQty)} price={fmt(total)} indent={T.indCatDont} />
              </div>

              {/* ── TVA ─────────────────────────────────────────────── */}
              <div
                style={{
                  marginTop: mm(T.gap * 2),
                  border: "0.25mm solid #000",
                  fontSize: mm(2.1),
                }}
              >
                {[
                  { cells: ["Taux", "TVA", "Base HT", "Base TTC"], invert: false },
                  { cells: ["10,00%", fmt(totalTVA), fmt(totalHT), fmt(total)], invert: false },
                  { cells: ["Totaux", fmt(totalTVA), fmt(totalHT), fmt(total)], invert: true },
                ].map((r, ri) => (
                  <div
                    key={ri}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(4, 1fr)",
                      height: mm(T.line),
                      lineHeight: mm(T.line),
                      backgroundColor: r.invert ? "#000" : "#fff",
                      color: r.invert ? "#fff" : "#000",
                      fontWeight: r.invert ? "bold" : "normal",
                    }}
                  >
                    {r.cells.map((c, ci) => (
                      <span
                        key={ci}
                        style={{ padding: "0 0.8mm", textAlign: ci === 0 ? "left" : "right" }}
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                ))}
              </div>

              <div style={{ marginTop: mm(T.gap * 2), textAlign: "center", fontSize: mm(2) }}>
                LA GAZELLE DE BABYLONE — Imprimé le {dateStr} {timeStr}
              </div>
              <div style={{ textAlign: "right", fontSize: mm(2) }}>Page: 1</div>
            </>
          )}
        </div>
      </div>
    );
  }
);

TicketPointex.displayName = "TicketPointex";

export default TicketPointex;
