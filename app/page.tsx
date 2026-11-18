"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Trash2,
  Plus,
  Minus,
  Loader2,
  CheckCircle,
  AlertCircle,
  Terminal,
  Copy,
  Printer,
} from "lucide-react";
import { type Famille, type Article } from "@/lib/supabase";
import { createClient as createBrowserClient } from "@/lib/supabase/client";
import { useCartStore } from "@/store/useCartStore";

// ── RLS fix SQL shown to user when tables are empty ──────────────────────────
const RLS_FIX_SQL = `-- Copiez et exécutez ce SQL dans Supabase → SQL Editor
ALTER TABLE familles DISABLE ROW LEVEL SECURITY;
ALTER TABLE articles DISABLE ROW LEVEL SECURITY;
ALTER TABLE commandes DISABLE ROW LEVEL SECURITY;
ALTER TABLE lignes_commande DISABLE ROW LEVEL SECURITY;`;

/** Format monétaire Pointex : 2 décimales, virgule FR */
const fmt = (n: number) => n.toFixed(2).replace(".", ",");

/** Points de remplissage (vrais caractères `.`, pas une bordure CSS) */
const DOTS = ".".repeat(120);

/** Colonnes numériques : qté 6ch + prix 10ch — inversion noire Pointex */
function TicketNums({ qty, price }: { qty: string; price: string }) {
  return (
    <span className="ticket-invert inline-flex shrink-0 bg-black text-white">
      <span className="inline-block w-[6ch] text-right tabular-nums">{qty}</span>
      <span className="inline-block w-[10ch] text-right tabular-nums">{price}</span>
    </span>
  );
}

/** Ligne de sous-total : libellé + ..... + bloc noir (qté/prix uniquement) */
function SummaryLine({
  label,
  qty,
  price,
  indent = 0,
}: {
  label: string;
  qty: string;
  price: string;
  /** 0 = niveau catégorie (Net BEVERAGE), 1 = sous-catégorie (Net Ventes / dont …) */
  indent?: 0 | 1;
}) {
  return (
    <div
      className={`flex items-baseline leading-none ${indent === 1 ? "pl-[1ch]" : ""}`}
    >
      <span className="shrink-0 whitespace-nowrap">{label}</span>
      <span className="min-w-[2ch] flex-1 overflow-hidden whitespace-nowrap">
        {DOTS}
      </span>
      <TicketNums qty={qty} price={price} />
    </div>
  );
}

/** Ligne article : double indent + qté/prix alignés sur la grille SummaryLine */
function ItemLine({
  name,
  qty,
  price,
}: {
  name: string;
  qty: string;
  price: string;
}) {
  return (
    <div className="flex items-baseline leading-none pl-[3ch]">
      <span className="min-w-0 flex-1 truncate uppercase pr-1">{name}</span>
      <span className="inline-block w-[6ch] shrink-0 text-right tabular-nums">
        {qty}
      </span>
      <span className="inline-block w-[10ch] shrink-0 text-right tabular-nums">
        {price}
      </span>
    </div>
  );
}

export default function POSPage() {
  const supabase = createBrowserClient();

  // ── State ─────────────────────────────────────────────────────────────────
  const [familles, setFamilles] = useState<Famille[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [selectedFamilleId, setSelectedFamilleId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [rlsBlocked, setRlsBlocked] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [sqlCopied, setSqlCopied] = useState(false);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // ── Cart store ────────────────────────────────────────────────────────────
  const { items, addItem, removeItem, updateQuantity, clearCart, getTotal } =
    useCartStore();

  // ── Popup window print ────────────────────────────────────────────────────
  const handlePrint = () => {
    const ticketElement = document.getElementById("ticket-container");
    if (!ticketElement) return;

    const printWindow = window.open("", "_blank", "width=400,height=600");
    if (!printWindow) {
      alert("Veuillez autoriser les pop-ups pour imprimer le ticket.");
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Ticket de Caisse — LA GAZELLE DE BABYLONE</title>
          <style>
            @page { margin: 0; size: 80mm auto; }

            html, body {
              margin: 0;
              padding: 0;
              background: #fff;
            }

            body {
              font-family: Courier, 'Courier New', monospace;
              width: 80mm;
              padding: 2mm 2.5mm 8mm 2.5mm;
              font-size: 11px;
              font-weight: bold;
              line-height: 1.1;
              color: #000;
              -webkit-font-smoothing: none;
              -moz-osx-font-smoothing: unset;
              text-rendering: crispEdges;
            }

            * {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
            }

            html, body, div, main, section, aside, p {
              height: auto !important;
              min-height: 0 !important;
              max-height: none !important;
              overflow: visible !important;
              position: static !important;
            }

            .flex { display: flex !important; }
            .inline-flex { display: inline-flex !important; }
            .inline-block { display: inline-block !important; }
            .flex-1 { flex: 1 1 0% !important; min-width: 0 !important; }
            .flex-col { flex-direction: column !important; }
            .items-baseline { align-items: baseline !important; }
            .items-center { align-items: center !important; }
            .justify-between { justify-content: space-between !important; }
            .shrink-0 { flex-shrink: 0 !important; }
            .min-w-0 { min-width: 0 !important; }
            .overflow-hidden { overflow: hidden !important; max-height: none !important; }
            .grid { display: grid !important; }
            .grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)) !important; }

            /* Inversion Pointex : fond noir UNIQUEMENT sur qté + prix */
            .bg-black,
            .ticket-invert {
              background-color: #000 !important;
              color: #fff !important;
              print-color-adjust: exact !important;
              -webkit-print-color-adjust: exact !important;
            }
            .bg-black *,
            .ticket-invert *,
            .text-white {
              color: #fff !important;
            }

            .text-black, .text-gray-300, .text-gray-400, .text-gray-500,
            .text-gray-600, .text-gray-700, .text-gray-800, .text-gray-900 {
              color: #000 !important;
            }

            .font-bold, .font-semibold, .font-medium { font-weight: bold !important; }
            .font-normal { font-weight: normal !important; }
            .font-mono { font-family: Courier, 'Courier New', monospace !important; }
            .uppercase { text-transform: uppercase; }
            .underline { text-decoration: underline; text-underline-offset: 2px; }
            .underline-offset-2 { text-underline-offset: 2px; }
            .text-\\[13px\\] { font-size: 13px !important; }
            .text-\\[11px\\] { font-size: 11px !important; }
            .text-\\[9px\\] { font-size: 9px !important; }
            .tracking-widest { letter-spacing: 0.1em; }
            .tracking-wide { letter-spacing: 0.03em; }
            .tabular-nums { font-variant-numeric: tabular-nums; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .whitespace-nowrap { white-space: nowrap !important; }
            .truncate {
              overflow: hidden !important;
              text-overflow: ellipsis !important;
              white-space: nowrap !important;
            }
            .leading-none { line-height: 1.1 !important; }
            .leading-tight { line-height: 1.15 !important; }

            .border { border: 1px solid #000; }
            .border-black { border-color: #000 !important; }
            .border-t { border-top: 1px solid #000; }

            .w-\\[6ch\\] { width: 6ch !important; }
            .w-\\[10ch\\] { width: 10ch !important; }
            .min-w-\\[2ch\\] { min-width: 2ch !important; }
            .pl-\\[1ch\\] { padding-left: 1ch !important; }
            .pl-\\[2ch\\] { padding-left: 2ch !important; }
            .pl-\\[3ch\\] { padding-left: 3ch !important; }
            .pr-1 { padding-right: 0.25em; }
            .px-1 { padding-left: 0.25em; padding-right: 0.25em; }
            .px-2 { padding-left: 0.4em; padding-right: 0.4em; }
            .py-0\\.5 { padding-top: 0; padding-bottom: 0; }
            .pt-1 { padding-top: 0.35em; }
            .pt-2 { padding-top: 0.5em; }
            .pb-0\\.5 { padding-bottom: 0.1em; }
            .pb-1 { padding-bottom: 0.25em; }
            .pb-2 { padding-bottom: 0.4em; }
            .mt-0\\.5 { margin-top: 0.15em; }
            .mt-1 { margin-top: 0.35em; }
            .mt-2 { margin-top: 0.5em; }
            .mt-\\[0\\.75em\\] { margin-top: 0.75em !important; }
            .mb-0 { margin-bottom: 0; }
            .mb-0\\.5 { margin-bottom: 0.15em; }
            .mb-1 { margin-bottom: 0.25em; }
            .mb-2 { margin-bottom: 0.45em; }

            button, .no-print, svg { display: none !important; }
          </style>
        </head>
        <body>
          ${ticketElement.innerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 350);
  };

  // ── Toast helper ──────────────────────────────────────────────────────────
  const showToast = useCallback(
    (type: "success" | "error", message: string) => {
      setToast({ type, message });
      setTimeout(() => setToast(null), 4000);
    },
    []
  );

  // ── Load data from Supabase ───────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      setLoading(true);
      setRlsBlocked(false);

      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", authData.user.id)
          .single();
        setIsAdmin(profile?.role === "admin");
      }

      const [
        { data: famillesData, error: fe },
        { data: articlesData, error: ae },
      ] = await Promise.all([
        supabase.from("familles").select("*").order("ordre_affichage").order("nom"),
        supabase.from("articles").select("*").eq("est_actif", true).order("nom"),
      ]);

      if (fe || ae) {
        const msg = (fe ?? ae)?.message ?? "Erreur inconnue";
        console.error("Erreur Supabase :", msg);
        showToast("error", `Supabase : ${msg}`);
      } else {
        const fams = famillesData ?? [];
        const arts = articlesData ?? [];
        setFamilles(fams);
        setArticles(arts);

        if (fams.length === 0 && arts.length === 0) {
          setRlsBlocked(true);
        }
        if (fams.length > 0) {
          setSelectedFamilleId(fams[0].id);
        }
      }
      setLoading(false);
    }
    load();
  }, [showToast]);

  // ── Filtered articles for the selected famille ────────────────────────────
  const filteredArticles = selectedFamilleId
    ? articles.filter((a) => a.famille_id === selectedFamilleId)
    : articles;

  // ── Cart grouped by famille for the ticket ───────────────────────────────
  const cartByFamille = items.reduce<Record<string, typeof items>>(
    (acc, item) => {
      const key = item.famille_nom;
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    },
    {}
  );

  // ── Copy SQL to clipboard ─────────────────────────────────────────────────
  const copySql = useCallback(() => {
    navigator.clipboard.writeText(RLS_FIX_SQL).then(() => {
      setSqlCopied(true);
      setTimeout(() => setSqlCopied(false), 2500);
    });
  }, []);

  // ── Checkout ──────────────────────────────────────────────────────────────
  const handleCheckout = useCallback(async () => {
    if (items.length === 0) return;
    setCheckoutLoading(true);

    const totalTTC = getTotal();
    const TVA = 0.1;
    const totalTVA = totalTTC * (TVA / (1 + TVA));
    const totalHT = totalTTC - totalTVA;

    try {
      const { data: commande, error: commandeError } = await supabase
        .from("commandes")
        .insert({
          total_ht: parseFloat(totalHT.toFixed(2)),
          total_ttc: parseFloat(totalTTC.toFixed(2)),
          mode_paiement: "ESPECE",
          statut: "payee",
        })
        .select()
        .single();

      if (commandeError || !commande) {
        throw new Error(commandeError?.message ?? "Erreur création commande");
      }

      const lignes = items.map((item) => ({
        commande_id: commande.id,
        article_id: item.id,
        nom_article_historique: item.nom,
        prix_unitaire_historique: item.prix_unitaire,
        quantite: item.quantite,
        sous_total: parseFloat((item.prix_unitaire * item.quantite).toFixed(2)),
      }));

      const { error: lignesError } = await supabase
        .from("lignes_commande")
        .insert(lignes);

      if (lignesError) throw new Error(lignesError.message);

      handlePrint();
      clearCart();
    } catch (err: unknown) {
      showToast(
        "error",
        err instanceof Error ? err.message : "Erreur lors de l'encaissement."
      );
    } finally {
      setCheckoutLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, getTotal, clearCart, showToast]);

  // ── Computed totals ───────────────────────────────────────────────────────
  const total = getTotal();
  const TVA_RATE = 0.1;
  const totalTVA = total * (TVA_RATE / (1 + TVA_RATE));
  const totalHT = total - totalTVA;
  const totalQty = items.reduce((s, i) => s + i.quantite, 0);

  // ── Date/time for ticket header ───────────────────────────────────────────
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

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-100 font-sans">

      {/* ════════════════════════════════════════════════════════════════════
          LEFT PANEL — Menu (flex-1)
      ════════════════════════════════════════════════════════════════════ */}
      <div className="flex flex-1 flex-col overflow-hidden">

        {/* ── Top bar ────────────────────────────────────────────────────── */}
        <header className="flex items-center justify-between border-b border-gray-200 bg-white px-5 py-3">
          <span className="text-sm font-bold tracking-widest text-gray-800 uppercase">
            GAIA BEACH
          </span>
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-400">{dateStr} — {timeStr}</span>
            <div className="h-4 w-px bg-gray-300"></div>
            {isAdmin && (
              <a href="/admin/menu" className="text-xs text-gray-500 hover:text-gray-900 transition-colors">
                Admin
              </a>
            )}
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                window.location.href = "/login";
              }}
              className="text-xs text-red-500 hover:text-red-700 transition-colors flex items-center gap-1"
            >
              Déconnexion
            </button>
          </div>
        </header>

        {/* ── RLS diagnostic banner ─────────────────────────────────────── */}
        {rlsBlocked && (
          <div className="border-b border-orange-200 bg-orange-50 px-4 py-3">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-orange-600">
              <Terminal size={13} />
              Accès bloqué par RLS Supabase — exécutez dans SQL Editor :
            </div>
            <div className="relative rounded bg-gray-900 p-3 font-mono text-xs text-gray-300">
              <pre className="whitespace-pre-wrap">{RLS_FIX_SQL}</pre>
              <button
                onClick={copySql}
                className="absolute right-2 top-2 flex cursor-pointer items-center gap-1 rounded bg-gray-700 px-2 py-1 text-xs hover:bg-gray-600"
              >
                <Copy size={10} />
                {sqlCopied ? "Copié !" : "Copier"}
              </button>
            </div>
          </div>
        )}

        {/* ── Body : nav verticale + grille articles ─────────────────────── */}
        <div className="flex flex-1 overflow-hidden">

          {/* ── Famille nav — colonne verticale ──────────────────────────── */}
          <nav className="flex w-44 shrink-0 flex-col overflow-y-auto border-r border-gray-200 bg-white scrollbar-hide">
            {loading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="mx-3 my-1.5 h-8 animate-pulse rounded bg-gray-100" />
                ))
              : familles.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setSelectedFamilleId(f.id)}
                    className={`cursor-pointer border-l-2 px-4 py-3 text-left text-xs font-medium leading-snug transition-colors ${
                      selectedFamilleId === f.id
                        ? "border-gray-800 bg-gray-100 text-gray-900"
                        : "border-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                    }`}
                  >
                    {f.nom}
                  </button>
                ))}
          </nav>

          {/* ── Article grid ───────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto p-3">
          {loading ? (
            <div className="grid grid-cols-3 gap-2 lg:grid-cols-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="h-20 animate-pulse rounded bg-white" />
              ))}
            </div>
          ) : filteredArticles.length === 0 ? (
            <div className="flex h-full items-center justify-center text-gray-400">
              <p className="text-sm">
                {articles.length === 0 && !rlsBlocked
                  ? "Aucun article en base de données."
                  : "Aucun article dans cette famille."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 lg:grid-cols-4">
              {filteredArticles.map((article) => {
                const inCart = items.find((i) => i.id === article.id);
                const famille = familles.find((f) => f.id === article.famille_id);
                return (
                  <button
                    key={article.id}
                    onClick={() =>
                      addItem({
                        id: article.id,
                        nom: article.nom,
                        prix_unitaire: article.prix_unitaire,
                        famille_id: article.famille_id,
                        famille_nom: famille?.nom ?? "Autre",
                      })
                    }
                    style={{ minHeight: "72px" }}
                    className={`relative flex cursor-pointer flex-col items-start justify-between border p-3 text-left transition-colors active:scale-[0.98] ${
                      inCart
                        ? "border-gray-400 bg-gray-200"
                        : "border-gray-200 bg-white hover:bg-gray-50"
                    }`}
                  >
                    {inCart && (
                      <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-gray-800 text-[10px] font-bold text-white">
                        {inCart.quantite}
                      </span>
                    )}
                    <span className="pr-5 text-xs font-medium leading-tight text-gray-700">
                      {article.nom}
                    </span>
                    <span className="mt-1 text-sm font-semibold text-gray-900">
                      {article.prix_unitaire.toFixed(2)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          RIGHT PANEL — Ticket / Rapport Z de caisse
      ════════════════════════════════════════════════════════════════════ */}
      <aside
        id="ticket-container"
        className="flex w-[420px] shrink-0 flex-col border-l border-gray-300 bg-white text-black"
        style={{
          fontFamily: "Courier, 'Courier New', monospace",
          WebkitFontSmoothing: "none",
          textRendering: "optimizeSpeed",
        }}
      >
        {/* ═══ Zone ticket thermique (80mm) ═══════════════════════════════ */}
        <div className="ticket-body flex-1 overflow-y-auto px-2.5 pt-3 pb-2 text-[11px] font-bold leading-none text-black">

          {/* En-tête Pointex (photo claire) :
              enseigne centrée + soulignée + un peu plus grande
              date centrée
              ARTICLE VENDUS centré, non souligné */}
          <div className="mb-2 text-center leading-none">
            <p className="text-[13px] uppercase underline underline-offset-2">
              LA GAZELLE DE BABYLONE
            </p>
            <p className="mt-0.5">Calculer la caisse du {dateStr}</p>
            <p className="mt-[0.75em] uppercase">ARTICLE VENDUS</p>
          </div>

          {items.length === 0 ? (
            <div className="flex h-40 items-center justify-center">
              <p className="text-[10px] font-normal text-gray-400">— ticket vide —</p>
            </div>
          ) : (
            <>
              {Object.entries(cartByFamille).map(([familleName, famItems]) => {
                const famQty = famItems.reduce((s, i) => s + i.quantite, 0);
                const famTotal = famItems.reduce(
                  (s, i) => s + i.prix_unitaire * i.quantite,
                  0
                );
                const cat = familleName.toUpperCase();
                const q = fmt(famQty);
                const p = fmt(famTotal);

                return (
                  <div key={familleName} className="mb-1">
                    {/* Catégorie — majuscules + souligné, flush left */}
                    <div className="pt-1">
                      <span className="uppercase underline">{cat}</span>
                    </div>

                    {/* Sous-catégorie — indentée + soulignée */}
                    <div className="pl-[1ch]">
                      <span className="underline">Ventes</span>
                    </div>

                    {/* Articles — double indent */}
                    {famItems.map((item) => (
                      <div key={item.id}>
                        <ItemLine
                          name={item.nom}
                          qty={fmt(item.quantite)}
                          price={fmt(item.prix_unitaire * item.quantite)}
                        />
                        <div className="no-print mb-0.5 flex items-center gap-1 pl-[3ch]">
                          <button
                            onClick={() => updateQuantity(item.id, -1)}
                            className="flex h-5 w-5 items-center justify-center border border-gray-200 bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-500"
                          >
                            <Minus size={9} />
                          </button>
                          <span className="w-5 text-center text-[10px] font-normal text-gray-500">
                            {item.quantite}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id, 1)}
                            className="flex h-5 w-5 items-center justify-center border border-gray-200 bg-gray-50 text-gray-400 hover:bg-gray-100"
                          >
                            <Plus size={9} />
                          </button>
                          <button
                            onClick={() => removeItem(item.id)}
                            className="ml-1 flex h-5 w-5 items-center justify-center text-gray-300 hover:text-red-400"
                          >
                            <Trash2 size={9} />
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* Totaux sous-catégorie (indentés comme "Ventes") */}
                    <SummaryLine label="Net Ventes" qty={q} price={p} indent={1} />
                    <SummaryLine label="dont Ventes" qty={q} price={p} indent={1} />

                    {/* Totaux catégorie : Net flush left + dont indenté
                        (Brut n'apparaît sur Pointex que s'il y a Remises/Offerts) */}
                    <SummaryLine label={`Net ${cat}`} qty={q} price={p} indent={0} />
                    <SummaryLine label="dont Ventes" qty={q} price={p} indent={1} />
                  </div>
                );
              })}

              {/* Totaux globaux */}
              <div className="mt-1 border-t border-black pt-1">
                <SummaryLine
                  label="Net Global"
                  qty={fmt(totalQty)}
                  price={fmt(total)}
                />
                <SummaryLine
                  label="Brut Global"
                  qty={fmt(totalQty)}
                  price={fmt(total)}
                />
                <SummaryLine
                  label="dont Ventes"
                  qty={fmt(totalQty)}
                  price={fmt(total)}
                />
              </div>

              {/* TVA */}
              <div className="mt-2 border border-black text-[9px] leading-tight">
                <div className="grid grid-cols-4">
                  <span className="px-1">Taux</span>
                  <span className="px-1 text-right">TVA</span>
                  <span className="px-1 text-right">Base HT</span>
                  <span className="px-1 text-right">Base TTC</span>
                </div>
                <div className="grid grid-cols-4">
                  <span className="px-1">10,00%</span>
                  <span className="px-1 text-right">{fmt(totalTVA)}</span>
                  <span className="px-1 text-right">{fmt(totalHT)}</span>
                  <span className="px-1 text-right">{fmt(total)}</span>
                </div>
                <div className="ticket-invert grid grid-cols-4 bg-black text-white">
                  <span className="px-1">Totaux</span>
                  <span className="px-1 text-right">{fmt(totalTVA)}</span>
                  <span className="px-1 text-right">{fmt(totalHT)}</span>
                  <span className="px-1 text-right">{fmt(total)}</span>
                </div>
              </div>

              <p className="mt-2 text-center text-[9px] font-normal leading-tight">
                LA GAZELLE DE BABYLONE — Imprimé le {dateStr} {timeStr}
              </p>
              <p className="text-right text-[9px] font-normal">Page: 1</p>
            </>
          )}
        </div>

        {/* ── Boutons UI (hors impression) ──────────────────────────────── */}
        <div className="no-print flex flex-col gap-2 border-t border-gray-200 bg-white p-3 font-sans">
          <button
            onClick={handlePrint}
            className="flex w-full cursor-pointer items-center justify-center gap-2 border border-dashed border-gray-300 py-2 text-xs font-medium text-gray-400 transition-colors hover:border-gray-400 hover:text-gray-600"
          >
            <Printer size={13} />
            Imprimer un exemple (test imprimante)
          </button>

          <div className="flex gap-2">
            <button
              onClick={clearCart}
              disabled={items.length === 0}
              title="Annuler / Vider le ticket"
              className="flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center border border-red-200 bg-red-50 text-red-500 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <Trash2 size={18} />
            </button>

            <button
              onClick={handleCheckout}
              disabled={items.length === 0 || checkoutLoading}
              className="flex flex-1 cursor-pointer items-center justify-center gap-2 bg-gray-900 py-3 text-sm font-bold uppercase tracking-wider text-white transition-colors hover:bg-gray-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {checkoutLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Encaissement…
                </>
              ) : (
                <>
                  <Printer size={16} />
                  Encaisser &amp; Imprimer
                </>
              )}
            </button>
          </div>
        </div>
      </aside>

      {/* ── Toast notification ────────────────────────────────────────────── */}
      {toast && (
        <div
          className={`fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded px-5 py-2.5 text-sm font-medium shadow-lg ${
            toast.type === "success"
              ? "bg-gray-900 text-white"
              : "bg-red-600 text-white"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle size={15} />
          ) : (
            <AlertCircle size={15} />
          )}
          {toast.message}
        </div>
      )}
    </div>
  );
}
