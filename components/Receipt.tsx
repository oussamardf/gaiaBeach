import React from "react";
import type { CartItem } from "@/store/useCartStore";

const TVA_RATE = 0.1; // 10% TVA

interface ReceiptProps {
  items: CartItem[];
  total: number;
  orderId?: number;
}

/** Pad string left with dots up to total width */
function dotPad(left: string, right: string, width: number): string {
  const gap = width - left.length - right.length;
  return left + ".".repeat(Math.max(1, gap)) + right;
}

/** Format number as fixed 2 decimals, right-aligned in a field */
function fmt(n: number): string {
  return n.toFixed(2);
}

const Receipt = React.forwardRef<HTMLDivElement, ReceiptProps>(
  ({ items, total, orderId }, ref) => {
    const now = new Date();
    const dateStr = now.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    const timeStr = now.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });

    // ── Group by famille ──────────────────────────────────────────────────
    const familleMap = new Map<string, CartItem[]>();
    for (const item of items) {
      const key = item.famille_nom.toUpperCase();
      if (!familleMap.has(key)) familleMap.set(key, []);
      familleMap.get(key)!.push(item);
    }

    // ── Totals ────────────────────────────────────────────────────────────
    const totalTTC = total;
    const totalTVA = totalTTC * (TVA_RATE / (1 + TVA_RATE));
    const totalHT = totalTTC - totalTVA;
    const totalQty = items.reduce((s, i) => s + i.quantite, 0);

    // ── Styles ────────────────────────────────────────────────────────────
    const W = 42; // character width of the ticket
    const base: React.CSSProperties = {
      fontFamily: "'Courier New', Courier, monospace",
      fontSize: "11px",
      lineHeight: "1.5",
      color: "#000",
      backgroundColor: "#fff",
    };

    return (
      <div
        ref={ref}
        style={{
          width: "72mm",
          maxWidth: "72mm",
          padding: "4mm 3mm 8mm",
          backgroundColor: "#fff",
          color: "#000",
          ...base,
        }}
      >
        {/* Force @page size for react-to-print */}
        <style>{`
          @page { size: 80mm auto; margin: 0; }
          body { width: 80mm; margin: 0; padding: 0; }
        `}</style>
        {/* ══ EN-TÊTE ══════════════════════════════════════════════════════ */}
        <div style={{ textAlign: "center", marginBottom: "6px" }}>
          <div
            style={{
              fontSize: "15px",
              fontWeight: "bold",
              letterSpacing: "3px",
              textTransform: "uppercase",
            }}
          >
            GAIA BEACH
          </div>
          <div style={{ fontSize: "10px" }}>Club de Plage — Ticket de caisse</div>
          <div style={{ fontSize: "10px", marginTop: "2px" }}>
            {dateStr} {timeStr}
            {orderId ? `   N° ${orderId}` : ""}
          </div>
        </div>

        <div style={{ borderTop: "1px solid #000", margin: "6px 0" }} />

        {/* ══ COLONNES EN-TÊTE ═════════════════════════════════════════════ */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontWeight: "bold",
            fontSize: "10px",
            textTransform: "uppercase",
            borderBottom: "1px solid #000",
            paddingBottom: "3px",
            marginBottom: "4px",
          }}
        >
          <span style={{ flex: 1 }}>Article</span>
          <span style={{ width: "32px", textAlign: "right" }}>Qté</span>
          <span style={{ width: "60px", textAlign: "right" }}>Total</span>
        </div>

        {/* ══ ARTICLES PAR FAMILLE ═════════════════════════════════════════ */}
        {Array.from(familleMap.entries()).map(([familleName, famItems]) => {
          const famQty = famItems.reduce((s, i) => s + i.quantite, 0);
          const famTotal = famItems.reduce(
            (s, i) => s + i.prix_unitaire * i.quantite,
            0
          );

          return (
            <div key={familleName} style={{ marginBottom: "8px" }}>
              {/* Famille header */}
              <div
                style={{
                  fontWeight: "bold",
                  textDecoration: "underline",
                  textTransform: "uppercase",
                  fontSize: "11px",
                  marginBottom: "2px",
                }}
              >
                {familleName}
              </div>
              <div style={{ fontSize: "10px", marginBottom: "2px" }}>
                Ventes
              </div>

              {/* Items */}
              {famItems.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    paddingLeft: "8px",
                    fontSize: "11px",
                  }}
                >
                  <span
                    style={{
                      flex: 1,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      maxWidth: "170px",
                    }}
                  >
                    {item.nom}
                  </span>
                  <span style={{ width: "32px", textAlign: "right" }}>
                    {item.quantite.toFixed(2)}
                  </span>
                  <span style={{ width: "60px", textAlign: "right" }}>
                    {fmt(item.prix_unitaire * item.quantite)}
                  </span>
                </div>
              ))}

              {/* Famille subtotals */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "11px",
                  fontWeight: "bold",
                  borderTop: "1px dotted #555",
                  marginTop: "2px",
                  paddingTop: "2px",
                  backgroundColor: "#000",
                  color: "#fff",
                  padding: "1px 4px",
                }}
              >
                <span style={{ flex: 1 }}>
                  Net Ventes {"·".repeat(Math.max(1, 14 - familleName.length))}
                </span>
                <span style={{ width: "32px", textAlign: "right" }}>
                  {famQty.toFixed(2)}
                </span>
                <span style={{ width: "60px", textAlign: "right" }}>
                  {fmt(famTotal)}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "11px",
                  fontWeight: "bold",
                  backgroundColor: "#000",
                  color: "#fff",
                  padding: "1px 4px",
                  marginBottom: "2px",
                }}
              >
                <span style={{ flex: 1 }}>
                  dont Ventes {"·".repeat(Math.max(1, 12 - familleName.length))}
                </span>
                <span style={{ width: "32px", textAlign: "right" }}>
                  {famQty.toFixed(2)}
                </span>
                <span style={{ width: "60px", textAlign: "right" }}>
                  {fmt(famTotal)}
                </span>
              </div>

              {/* Net FAMILLE line */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "11px",
                  fontWeight: "bold",
                  backgroundColor: "#000",
                  color: "#fff",
                  padding: "1px 4px",
                }}
              >
                <span style={{ flex: 1 }}>
                  Net {familleName.slice(0, 12)}{" "}
                  {"·".repeat(Math.max(1, 8 - familleName.length))}
                </span>
                <span style={{ width: "32px", textAlign: "right" }}>
                  {famQty.toFixed(2)}
                </span>
                <span style={{ width: "60px", textAlign: "right" }}>
                  {fmt(famTotal)}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "11px",
                  backgroundColor: "#000",
                  color: "#fff",
                  padding: "1px 4px",
                  marginBottom: "4px",
                }}
              >
                <span style={{ flex: 1 }}>dont Ventes ·····</span>
                <span style={{ width: "32px", textAlign: "right" }}>
                  {famQty.toFixed(2)}
                </span>
                <span style={{ width: "60px", textAlign: "right" }}>
                  {fmt(famTotal)}
                </span>
              </div>
            </div>
          );
        })}

        {/* ══ TOTAUX GÉNÉRAUX ══════════════════════════════════════════════ */}
        <div style={{ borderTop: "2px solid #000", marginTop: "8px", paddingTop: "6px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "11px",
            }}
          >
            <span style={{ flex: 1 }}>
              {dotPad("Net BOISSONS", "", W - 26)}
            </span>
            <span style={{ width: "32px", textAlign: "right" }}>
              {totalQty.toFixed(2)}
            </span>
            <span style={{ width: "60px", textAlign: "right" }}>
              {fmt(totalTTC)}
            </span>
          </div>

          <div style={{ borderTop: "1px solid #000", margin: "6px 0" }} />

          {/* TVA detail */}
          <div style={{ marginBottom: "6px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "10px",
                fontWeight: "bold",
                borderBottom: "1px solid #000",
                paddingBottom: "2px",
                marginBottom: "2px",
              }}
            >
              <span style={{ width: "40px" }}>Taux</span>
              <span style={{ width: "50px", textAlign: "right" }}>TVA</span>
              <span style={{ width: "60px", textAlign: "right" }}>Base HT</span>
              <span style={{ width: "60px", textAlign: "right" }}>Base TTC</span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "10px",
              }}
            >
              <span style={{ width: "40px" }}>
                {(TVA_RATE * 100).toFixed(2)}%
              </span>
              <span style={{ width: "50px", textAlign: "right" }}>
                {fmt(totalTVA)}
              </span>
              <span style={{ width: "60px", textAlign: "right" }}>
                {fmt(totalHT)}
              </span>
              <span style={{ width: "60px", textAlign: "right" }}>
                {fmt(totalTTC)}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "10px",
                fontWeight: "bold",
                backgroundColor: "#000",
                color: "#fff",
                padding: "1px 4px",
                marginTop: "2px",
              }}
            >
              <span style={{ width: "40px" }}>Totaux</span>
              <span style={{ width: "50px", textAlign: "right" }}>
                {fmt(totalTVA)}
              </span>
              <span style={{ width: "60px", textAlign: "right" }}>
                {fmt(totalHT)}
              </span>
              <span style={{ width: "60px", textAlign: "right" }}>
                {fmt(totalTTC)}
              </span>
            </div>
          </div>

          <div style={{ borderTop: "2px solid #000", paddingTop: "4px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "13px",
                fontWeight: "bold",
              }}
            >
              <span>TOTAL TTC</span>
              <span>{fmt(totalTTC)} €</span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "11px",
                color: "#333",
              }}
            >
              <span>dont TVA ({(TVA_RATE * 100).toFixed(0)}%)</span>
              <span>{fmt(totalTVA)} €</span>
            </div>
          </div>
        </div>

        {/* ══ PIED DE PAGE ═════════════════════════════════════════════════ */}
        <div
          style={{
            borderTop: "1px dashed #000",
            marginTop: "10px",
            paddingTop: "6px",
            textAlign: "center",
            fontSize: "10px",
            color: "#444",
          }}
        >
          <div>Merci de votre visite !</div>
          <div style={{ marginTop: "2px", letterSpacing: "2px" }}>
            ✦ GAIA BEACH ✦
          </div>
          <div style={{ marginTop: "2px" }}>Page: 1</div>
        </div>
      </div>
    );
  }
);

Receipt.displayName = "Receipt";

export default Receipt;
