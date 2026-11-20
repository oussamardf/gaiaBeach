"use client";

/*
 * BILAN TOTAL (Rapport Z) — LA GAZELLE DE BABYLONE
 *
 * 1. Formulaire de saisie (masqué à l'impression : print:hidden)
 * 2. Ticket thermique 80 mm (#ticket-container) reproduisant le ticket Pointex.
 *
 * Toutes les cotes du ticket sont en millimètres, mesurées sur le ticket original
 * (scan CamScanner du 07/11/2026). Styles inline → rendu identique écran / papier.
 */

import { useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import { useNomEtablissement } from "@/lib/useNomEtablissement";

// ════════════════════════════════════════════════════════════════════════════
//  RÉGLAGES
// ════════════════════════════════════════════════════════════════════════════


/**
 * Police du ticket. L'original Pointex est en Arial (police proportionnelle,
 * vérifiée sur le scan). Pour une police à chasse fixe, remplacer par :
 *   "'Courier New', Courier, monospace"
 */
const POLICE = "Arial, Helvetica, sans-serif";

/** Sur l'original, « Sous état général » et « Répartition des T.V.A… » ne sont
 *  PAS soulignés. Passer à true pour les souligner. */
const SOULIGNER_TOUS_LES_TITRES = false;

/** Cotes du ticket (mm) */
const T = {
  paper: 80,
  marginLeft: 2.9, // bord gauche du texte
  content: 67.2, // largeur utile (bord droit des montants à 70,1 mm du papier)
  font: 2.6, // corps du texte
  line: 3.25, // interligne (mesuré : 3,25 mm)
  dotsEnd: 47, // fin des points de suite
  indent: 3.3, // retrait « Règlements… » / « Mouvements de caisse »
  // Tableau « Sous état général » (depuis le bord gauche du texte)
  seCol1: 33.2,
  seCol2: 46.4,
  // Tableaux T.V.A.
  tvaCol1: 12.0,
  tvaCol2: 28.6,
  tvaCol3: 45.7,
  tvaRight: 66.9,
  footerClip: 53.7,
} as const;

const TVA_RATE = 0.1;

// ════════════════════════════════════════════════════════════════════════════
//  FORMATAGE
// ════════════════════════════════════════════════════════════════════════════

const mm = (v: number) => `${v}mm`;
/** 150000,00 — 2 décimales, virgule, sans séparateur de milliers (Pointex) */
const fmt = (n: number) => (Number.isFinite(n) ? n : 0).toFixed(2).replace(".", ",");
const fmtInt = (n: number) => String(Math.round(Number.isFinite(n) ? n : 0));
/** Accepte « 1500,50 » ou « 1500.50 » */
const num = (s: string) => {
  const v = parseFloat(s.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(v) ? v : 0;
};
const DOTS = ".".repeat(200);

// ════════════════════════════════════════════════════════════════════════════
//  BRIQUES DU TICKET
// ════════════════════════════════════════════════════════════════════════════

const row: CSSProperties = {
  position: "relative",
  height: mm(T.line),
  lineHeight: mm(T.line),
  whiteSpace: "nowrap",
};

/** Ligne vide (une interligne) */
const Blank = () => <div style={{ height: mm(T.line) }} />;

/** Libellé + points de suite + montant aligné à droite */
function Line({
  label,
  value,
  bold = false,
  indent = 0,
  dots = true,
  clipAt,
}: {
  label: string;
  value?: string;
  bold?: boolean;
  indent?: number;
  dots?: boolean;
  /** coupe le libellé à cette position (mm), comme l'original */
  clipAt?: number;
}) {
  const end = clipAt ?? T.dotsEnd;
  return (
    <div style={row}>
      <span
        style={{
          position: "absolute",
          left: mm(indent),
          width: mm(end - indent),
          top: 0,
          overflow: "hidden",
        }}
      >
        {label}
        {dots && (
          <>
            {"  "}
            <span style={{ fontSize: mm(2.3) }}>{DOTS}</span>
          </>
        )}
      </span>
      {value !== undefined && (
        <span
          style={{
            position: "absolute",
            right: 0,
            top: 0,
            fontWeight: bold ? "bold" : "normal",
          }}
        >
          {value}
        </span>
      )}
    </div>
  );
}

/** Titre de section (Totaux, Statistiques…) */
function SectionTitle({
  text,
  underline = true,
  marginTop,
  marginBottom,
}: {
  text: string;
  underline?: boolean;
  marginTop: number;
  marginBottom: number;
}) {
  return (
    <div
      style={{
        marginTop: mm(marginTop),
        marginBottom: mm(marginBottom),
        fontSize: mm(3.4),
        lineHeight: mm(4.5),
        height: mm(4.5),
        textDecoration: underline ? "underline" : "none",
        textDecorationThickness: "0.3mm",
        textUnderlineOffset: "0.3mm",
      }}
    >
      {text}
    </div>
  );
}

const vline = (left: number, top: number, height: number): CSSProperties => ({
  position: "absolute",
  left: mm(left),
  top: mm(top),
  height: mm(height),
  borderLeft: "0.25mm solid #000",
});

/** Tableau « Mode de réglement / Qté. / Montant » */
function SousEtatTable({
  lignes,
}: {
  lignes: { mode: string; qte: string; montant: string }[];
}) {
  const H = 11.7; // hauteur mesurée (en-tête + 2 lignes)
  const rowTops = [0.61, 4.85, 8.07]; // en-tête, 1re ligne, 2e ligne (mesurés)
  const cell = (top: number): CSSProperties => ({
    position: "absolute",
    top: mm(top),
    height: mm(T.line),
    lineHeight: mm(T.line),
    whiteSpace: "nowrap",
  });
  return (
    <div style={{ position: "relative", height: mm(H) }}>
      <span style={vline(0, 0, H)} />
      <span style={vline(T.seCol1, 0, H)} />
      <span style={vline(T.seCol2, 0, H)} />
      <span style={vline(T.content, 0, H)} />
      {/* En-têtes centrés */}
      <span style={{ ...cell(rowTops[0]), left: 0, width: mm(T.seCol1), textAlign: "center", fontWeight: "bold" }}>
        Mode de réglement
      </span>
      <span style={{ ...cell(rowTops[0]), left: mm(T.seCol1), width: mm(T.seCol2 - T.seCol1), textAlign: "center", fontWeight: "bold" }}>
        Qté.
      </span>
      <span style={{ ...cell(rowTops[0]), left: mm(T.seCol2), width: mm(T.content - T.seCol2), textAlign: "center", fontWeight: "bold" }}>
        Montant
      </span>
      {lignes.map((l, i) => (
        <div key={l.mode}>
          <span style={{ ...cell(rowTops[i + 1]), left: mm(0.7), textTransform: "uppercase" }}>{l.mode}</span>
          <span style={{ ...cell(rowTops[i + 1]), right: mm(T.content - T.seCol2 + 0.9) }}>{l.qte}</span>
          <span style={{ ...cell(rowTops[i + 1]), right: mm(1.2) }}>{l.montant}</span>
        </div>
      ))}
    </div>
  );
}

/** Tableau de répartition de la T.V.A. sur un montant TTC */
function TvaTable({ titre, ttc, marginTop }: { titre: string; ttc: number; marginTop: number }) {
  const ht = ttc / (1 + TVA_RATE);
  const tva = ttc - ht;
  // Mesuré sur l'original (depuis la ligne de base du titre) :
  // traits +0,35 · en-tête +4,35 · 10,00% +8,65 · Totaux +13,05 · bas des traits +15,0
  const H = 14.65; // haut → bas des traits
  const tops = { header: 1.47, r1: 5.77, r2: 10.17 }; // en-tête / 10,00% / Totaux
  const cell = (top: number, bold: boolean): CSSProperties => ({
    position: "absolute",
    top: mm(top),
    height: mm(T.line),
    lineHeight: mm(T.line),
    whiteSpace: "nowrap",
    fontWeight: bold ? "bold" : "normal",
  });
  const cols: [number, number][] = [
    [0, T.tvaCol1],
    [T.tvaCol1, T.tvaCol2],
    [T.tvaCol2, T.tvaCol3],
    [T.tvaCol3, T.tvaRight],
  ];
  const headers = ["Taux", "TVA", "Base HT", "Base TTC"];
  const values = [fmt(tva), fmt(ht), fmt(ttc)];
  return (
    <div style={{ marginTop: mm(marginTop) }}>
      <div
        style={{
          textAlign: "center",
          fontWeight: "bold",
          fontSize: mm(2.65), // titre mesuré : 40,5 mm de large
          height: mm(T.line),
          lineHeight: mm(T.line),
          textDecoration: SOULIGNER_TOUS_LES_TITRES ? "underline" : "none",
        }}
      >
        {titre}
      </div>
      <div style={{ position: "relative", height: mm(H), marginTop: mm(-0.37) }}>
        <span style={vline(0, 0, H)} />
        <span style={vline(T.tvaCol1, 0, H)} />
        <span style={vline(T.tvaCol2, 0, H)} />
        <span style={vline(T.tvaCol3, 0, H)} />
        <span style={vline(T.tvaRight, 0, H)} />
        {headers.map((h, i) => (
          <span
            key={h}
            style={{
              ...cell(tops.header, true),
              left: mm(cols[i][0]),
              width: mm(cols[i][1] - cols[i][0]),
              textAlign: "center",
            }}
          >
            {h}
          </span>
        ))}
        {[
          { top: tops.r1, label: "10,00%", bold: false },
          { top: tops.r2, label: "Totaux", bold: true },
        ].map((r) => (
          <div key={r.label}>
            <span style={{ ...cell(r.top, r.bold), left: mm(0.6) }}>{r.label}</span>
            {values.map((v, i) => (
              <span
                key={i}
                style={{ ...cell(r.top, r.bold), right: mm(T.content - cols[i + 1][1] + 2.0) }}
              >
                {v}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  PAGE
// ════════════════════════════════════════════════════════════════════════════

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export default function BilanTotalPage() {
  // ── États manuels ────────────────────────────────────────────────────────
  const [dateISO, setDateISO] = useState(todayISO);
  const { nom: nomEtab, setNom: setNomEtab, nomImprime } = useNomEtablissement();
  const [especeQte, setEspeceQte] = useState("");
  const [especeMontant, setEspeceMontant] = useState("");
  const [carteQte, setCarteQte] = useState("");
  const [carteMontant, setCarteMontant] = useState("");
  const [notesSoldees, setNotesSoldees] = useState("");
  const [notesOuvertes, setNotesOuvertes] = useState("");
  const [remises, setRemises] = useState("");
  const [offerts, setOfferts] = useState("");
  const [offertsPersonnel, setOffertsPersonnel] = useState("");
  const [annulations, setAnnulations] = useState("");

  // ── Calculs automatiques ─────────────────────────────────────────────────
  const c = useMemo(() => {
    const espM = num(especeMontant);
    const carM = num(carteMontant);
    // Nombre de notes payantes = Qté ESPECE + Qté CARTE DE CREDIT (calculé)
    const nombreNotesPayantes = Math.round(num(especeQte) + num(carteQte));
    const nbNotes = nombreNotesPayantes;
    const rem = num(remises);
    const off = num(offerts);

    const ventesEncaissees = espM + carM; // 1
    const totalActivite = ventesEncaissees; // 2
    const totalEnCaisse = ventesEncaissees; // 3
    const moyenneNotes = nbNotes > 0 ? ventesEncaissees / nbNotes : 0; // 4 (÷0 → 0)
    const totalCABrut = ventesEncaissees + rem + off; // 5
    const totalCANet = ventesEncaissees; // 6
    const totalHorsTaxes = totalCANet / (1 + TVA_RATE); // 7

    return {
      nombreNotesPayantes,
      ventesEncaissees,
      totalActivite,
      totalEnCaisse,
      moyenneNotes,
      totalCABrut,
      totalCANet,
      totalHorsTaxes,
    };
  }, [especeQte, carteQte, especeMontant, carteMontant, remises, offerts]);

  const dateCaisse = new Date(`${dateISO || todayISO()}T12:00:00`);
  const dateStr = dateCaisse.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const now = new Date();
  // jour = date de la caisse choisie ; heure = heure réelle d'impression
  const printedLong = `${dateCaisse.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })} à ${now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;

  // ── Impression : fenêtre dédiée contenant uniquement le ticket ──────────
  // (le ticket est en styles inline → rendu identique ; la règle @media print
  //  de globals.css, qui masque toute la page, ne s'applique pas ici)
  const handlePrint = () => {
    const ticket = document.getElementById("ticket-container");
    if (!ticket) return;
    const w = window.open("", "_blank", "width=420,height=800");
    if (!w) {
      alert("Veuillez autoriser les pop-ups pour imprimer le bilan.");
      return;
    }
    w.document.write(`<!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Bilan total — ${nomImprime}</title>
          <style>
            @page { size: 80mm auto; margin: 0; }
            html, body { margin: 0; padding: 0; background: #fff; width: 80mm; }
            * {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          </style>
        </head>
        <body>${ticket.outerHTML}</body>
      </html>`);
    w.document.close();
    w.focus();
    setTimeout(() => {
      w.print();
      w.close();
    }, 350);
  };

  // ── Champs du formulaire ─────────────────────────────────────────────────
  const champs: {
    groupe: string;
    items: { label: string; value: string; set: (v: string) => void; entier?: boolean }[];
  }[] = [
    {
      groupe: "Modes de règlement",
      items: [
        { label: "Espèces — quantité", value: especeQte, set: setEspeceQte, entier: true },
        { label: "Espèces — montant", value: especeMontant, set: setEspeceMontant },
        { label: "Carte — quantité", value: carteQte, set: setCarteQte, entier: true },
        { label: "Carte — montant", value: carteMontant, set: setCarteMontant },
      ],
    },
    {
      groupe: "Notes",
      items: [
        { label: "Notes soldées", value: notesSoldees, set: setNotesSoldees, entier: true },
        { label: "Notes ouvertes", value: notesOuvertes, set: setNotesOuvertes, entier: true },
      ],
    },
    {
      groupe: "Remises / Offerts / Annulations",
      items: [
        { label: "Remises", value: remises, set: setRemises },
        { label: "Offerts", value: offerts, set: setOfferts },
        { label: "Offerts personnel", value: offertsPersonnel, set: setOffertsPersonnel },
        { label: "Annulations", value: annulations, set: setAnnulations },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-gray-100 font-sans print:bg-white">

      {/* ══ 1. FORMULAIRE (jamais imprimé) ══════════════════════════════════ */}
      <div className="print:hidden mx-auto max-w-3xl p-4">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-800">Bilan total (Rapport Z)</h1>
          <div className="flex items-center gap-3">
            <Link href="/" className="text-xs text-gray-500 hover:text-gray-800">
              ← Retour caisse
            </Link>
            <button
              onClick={handlePrint}
              className="cursor-pointer rounded bg-gray-900 px-4 py-2 text-sm font-bold text-white hover:bg-gray-800"
            >
              Imprimer le bilan
            </button>
          </div>
        </div>

        <div className="rounded border border-gray-200 bg-white p-4">
          <label className="mb-3 flex items-center gap-3 text-sm">
            <span className="w-48 font-medium text-gray-700">Nom de l&apos;établissement</span>
            <input
              type="text"
              value={nomEtab}
              onChange={(e) => setNomEtab(e.target.value)}
              placeholder="DJADJA AFRO CLUB"
              className="w-72 rounded border border-gray-300 px-2 py-1"
            />
          </label>
          <label className="mb-4 flex items-center gap-3 text-sm">
            <span className="w-48 font-medium text-gray-700">Date de la caisse</span>
            <input
              type="date"
              value={dateISO}
              onChange={(e) => setDateISO(e.target.value)}
              className="rounded border border-gray-300 px-2 py-1"
            />
          </label>

          <div className="grid gap-4 md:grid-cols-3">
            {champs.map((g) => (
              <fieldset key={g.groupe} className="rounded border border-gray-200 p-3">
                <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {g.groupe}
                </legend>
                {g.items.map((it) => (
                  <label key={it.label} className="mb-2 block text-xs text-gray-600">
                    {it.label}
                    <input
                      inputMode={it.entier ? "numeric" : "decimal"}
                      value={it.value}
                      onChange={(e) => it.set(e.target.value)}
                      placeholder={it.entier ? "0" : "0,00"}
                      className="mt-0.5 w-full rounded border border-gray-300 px-2 py-1 text-right text-sm text-gray-900 tabular-nums focus:border-gray-500 focus:outline-none"
                    />
                  </label>
                ))}
              </fieldset>
            ))}
          </div>

          {/* Récapitulatif des calculs */}
          <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1 rounded bg-gray-50 p-3 text-xs text-gray-600 md:grid-cols-4">
            <span>Ventes encaissées : <b>{fmt(c.ventesEncaissees)}</b></span>
            <span>Notes payantes : <b>{fmtInt(c.nombreNotesPayantes)}</b></span>
            <span>Moyenne notes : <b>{fmt(c.moyenneNotes)}</b></span>
            <span>Total C.A. brut : <b>{fmt(c.totalCABrut)}</b></span>
            <span>Total hors taxes : <b>{fmt(c.totalHorsTaxes)}</b></span>
          </div>
        </div>
      </div>

      {/* ══ 2. TICKET THERMIQUE 80 mm ═══════════════════════════════════════ */}
      <div className="flex justify-center pb-10 print:block print:p-0">
        <div
          id="ticket-container"
          className="shadow-sm print:shadow-none"
          style={{
            width: mm(T.paper),
            boxSizing: "border-box",
            padding: `${mm(3)} 0 ${mm(8)} ${mm(T.marginLeft)}`,
            backgroundColor: "#fff",
            color: "#000",
            fontFamily: POLICE,
            fontSize: mm(T.font),
            lineHeight: mm(T.line),
            WebkitFontSmoothing: "none",
            textRendering: "optimizeSpeed",
          }}
        >
          <div style={{ width: mm(T.content) }}>
            {/* ── En-tête ──────────────────────────────────────────────── */}
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: mm(3.2), lineHeight: mm(3.5), fontWeight: "bold" }}>
                LA GAZELLE DE BABYLONE
              </div>
              <div style={{ fontSize: mm(3.2), lineHeight: mm(3.5) }}>
                Calculer la caisse du {dateStr}
              </div>
              <div style={{ fontSize: mm(3.9), lineHeight: mm(5.51) }}>BILAN TOTAL</div>
            </div>
            <div
              style={{
                fontSize: mm(4.4),
                lineHeight: mm(3.78),
                fontWeight: "bold",
                textDecoration: "underline",
                textDecorationThickness: "0.35mm",
                textUnderlineOffset: "0.15mm", // soulignement collé aux lettres (mesuré)
              }}
            >
              {nomImprime}
            </div>
            {/* fin pointillé sous le nom de l'établissement */}
            <div
              style={{
                marginTop: mm(0.535),
                width: mm(46),
                height: mm(0.2),
                backgroundImage:
                  "repeating-linear-gradient(to right, #000 0, #000 0.2mm, transparent 0.2mm, transparent 0.5mm)",
              }}
            />

            {/* ── Sous état général ────────────────────────────────────── */}
            <SectionTitle
              text="Sous état général"
              underline={SOULIGNER_TOUS_LES_TITRES}
              marginTop={3.8}
              marginBottom={0.25}
            />
            <SousEtatTable
              lignes={[
                { mode: "ESPECE", qte: fmt(num(especeQte)), montant: fmt(num(especeMontant)) },
                { mode: "CARTE DE CREDIT", qte: fmt(num(carteQte)), montant: fmt(num(carteMontant)) },
              ]}
            />

            {/* ── Totaux ───────────────────────────────────────────────── */}
            <SectionTitle text="Totaux" marginTop={6.19} marginBottom={3.25} />
            <Line label="Ventes encaissées" value={fmt(c.ventesEncaissees)} bold />
            <Blank />
            <Line label="Total de l'activité" value={fmt(c.totalActivite)} bold />

            {/* ── Statistiques ─────────────────────────────────────────── */}
            <SectionTitle text="Statistiques" marginTop={2.05} marginBottom={3.62} />
            <Line label="Nombre de notes payantes" value={fmtInt(c.nombreNotesPayantes)} />
            <Line label="Moyenne notes" value={fmt(c.moyenneNotes)} />
            <Blank />
            <Line label="Notes soldées" value={fmtInt(num(notesSoldees))} />
            <Line label="Notes ouvertes" value={fmtInt(num(notesOuvertes))} />
            <Blank />
            <Line label="Remises" value={fmt(num(remises))} />
            <Line label="Offerts" value={fmt(num(offerts))} />
            <Line label="Offerts personnel" value={fmt(num(offertsPersonnel))} />
            <Line label="Annulations" value={fmt(num(annulations))} />
            <Blank />
            <Line label="Total C.A. brut" value={fmt(c.totalCABrut)} />
            <Line label="Total C.A. net" value={fmt(c.totalCANet)} />
            <Blank />
            <Line label="Total Hors Taxes" value={fmt(c.totalHorsTaxes)} />

            {/* ── Répartition des T.V.A. ───────────────────────────────── */}
            <TvaTable titre="Répartition des T.V.A. sur le C.A." ttc={c.totalCANet} marginTop={4.5} />
            <TvaTable titre="Répartition des T.V.A. sur les Remises" ttc={num(remises)} marginTop={2.71} />
            <TvaTable titre="Répartition des T.V.A. sur les Offerts" ttc={num(offerts)} marginTop={2.71} />

            {/* ── Pied Pointex ─────────────────────────────────────────── */}
            <div style={{ ...row, marginTop: mm(14.22) }}>
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
              <span style={{ position: "absolute", right: 0, top: 0 }}>Page: 1</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
