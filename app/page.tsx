"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useReactToPrint } from "react-to-print";
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
import Receipt from "@/components/Receipt";

// ── RLS fix SQL shown to user when tables are empty ──────────────────────────
const RLS_FIX_SQL = `-- Copiez et exécutez ce SQL dans Supabase → SQL Editor
ALTER TABLE familles DISABLE ROW LEVEL SECURITY;
ALTER TABLE articles DISABLE ROW LEVEL SECURITY;
ALTER TABLE commandes DISABLE ROW LEVEL SECURITY;
ALTER TABLE lignes_commande DISABLE ROW LEVEL SECURITY;`;

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
  const [lastOrderId, setLastOrderId] = useState<number | undefined>();
  const [isAdmin, setIsAdmin] = useState(false);

  // ── Cart store ────────────────────────────────────────────────────────────
  const { items, addItem, removeItem, updateQuantity, clearCart, getTotal } =
    useCartStore();

  // ── Receipt ref ───────────────────────────────────────────────────────────
  const receiptRef = useRef<HTMLDivElement>(null);
  const reactToPrintFn = useReactToPrint({ contentRef: receiptRef });

  // ── Test receipt ref (données fictives pour tester l'imprimante) ──────────
  const testReceiptRef = useRef<HTMLDivElement>(null);
  const testPrintFn = useReactToPrint({ contentRef: testReceiptRef });
  const TEST_ITEMS = [
    { id: 1, nom: "COCA COLA 33CL",    prix_unitaire: 4.5,  quantite: 2, famille_id: 1, famille_nom: "Boissons" },
    { id: 2, nom: "EAU MINÉRALE",      prix_unitaire: 2.5,  quantite: 3, famille_id: 1, famille_nom: "Boissons" },
    { id: 3, nom: "CHIPS NATURE",      prix_unitaire: 3.0,  quantite: 1, famille_id: 2, famille_nom: "Snacks"   },
    { id: 4, nom: "MOJITO SANS ALCOOL",prix_unitaire: 8.0,  quantite: 2, famille_id: 3, famille_nom: "Cocktails"},
  ];
  const TEST_TOTAL = TEST_ITEMS.reduce((s, i) => s + i.prix_unitaire * i.quantite, 0);

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

      console.group("🏖️ GAIA BEACH — Chargement menu");
      console.log("familles →", { data: famillesData, error: fe });
      console.log("articles →", { data: articlesData, error: ae });
      console.groupEnd();

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

      setLastOrderId(commande.id);
      await new Promise((r) => setTimeout(r, 60));
      reactToPrintFn();
      clearCart();
      // commande encaissée avec succès
    } catch (err: unknown) {
      showToast(
        "error",
        err instanceof Error ? err.message : "Erreur lors de l'encaissement."
      );
    } finally {
      setCheckoutLoading(false);
    }
  }, [items, getTotal, clearCart, showToast, reactToPrintFn]);

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
    <div className="flex h-screen w-screen overflow-hidden bg-gray-100 font-sans print:block print:h-auto print:overflow-visible print:w-[80mm]">
      {/* ── Global print styles: 80mm thermal paper ─────────────────────── */}
      <style>{`
        @media print {
          @page {
            margin: 0;
            size: 80mm auto;
          }
          body {
            width: 80mm;
            margin: 0;
            padding: 0;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
      {/* ── Off-screen receipt for printing (must be rendered, NOT display:none) ── */}
      <div style={{ position: "fixed", left: "-9999px", top: 0, visibility: "hidden" }}>
        <Receipt ref={receiptRef} items={items} total={total} orderId={lastOrderId} />
      </div>

      {/* ── Off-screen test receipt (données fictives) ───────────────────── */}
      <div style={{ position: "fixed", left: "-9999px", top: 0, visibility: "hidden" }}>
        <Receipt ref={testReceiptRef} items={TEST_ITEMS} total={TEST_TOTAL} orderId={undefined} />
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          LEFT PANEL — Menu (flex-1) — masqué à l'impression
      ════════════════════════════════════════════════════════════════════ */}
      <div className="flex flex-1 flex-col overflow-hidden print:hidden">

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
        className="flex w-[420px] shrink-0 flex-col border-l border-gray-300 bg-white print:block print:w-full print:m-0 print:shadow-none print:border-none print:overflow-visible"
        style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" } as React.CSSProperties}
      >

        {/* ── Ticket header ─────────────────────────────────────────────── */}
        <div className="border-b border-dashed border-gray-400 px-4 py-3 font-mono text-center">
          <p className="text-xs font-bold tracking-widest text-gray-900 uppercase">GAIA BEACH</p>
          <p className="text-[10px] text-gray-500 mt-0.5">Rapport Z — Bilan Total</p>
          <p className="text-[10px] text-gray-400 mt-0.5">{dateStr} — {timeStr}</p>
        </div>

        {/* ── Title + column headers ─────────────────────────────────────── */}
        <div className="border-b border-dashed border-gray-400 px-3 py-1.5 font-mono">
          <p className="text-center text-[11px] font-bold uppercase tracking-widest text-gray-800 mb-1.5">
            ARTICLE VENDU
          </p>
          <div className="flex items-center">
            <span className="flex-1 text-[9px] font-bold uppercase text-gray-400">Désignation</span>
            <span className="w-16 text-center text-[9px] font-bold uppercase text-gray-400">Qté</span>
            <span className="w-20 text-right text-[9px] font-bold uppercase text-gray-400">Montant</span>
          </div>
        </div>

        {/* ── Scrollable ticket body ─────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto font-mono text-xs print:overflow-visible print:flex-none">
          {items.length === 0 ? (
            <div className="flex h-full items-center justify-center text-gray-300">
              <p className="text-[10px]">— ticket vide —</p>
            </div>
          ) : (
            <div>
              {Object.entries(cartByFamille).map(([familleName, famItems]) => {
                const famQty  = famItems.reduce((s, i) => s + i.quantite, 0);
                const famTotal = famItems.reduce((s, i) => s + i.prix_unitaire * i.quantite, 0);
                const fmt = (n: number) => n.toFixed(2).replace(".", ",");
                return (
                  <div key={familleName}>

                    {/* ── Famille name — souligné */}
                    <div className="px-3 pt-2 pb-0.5">
                      <span className="text-[11px] font-bold uppercase underline underline-offset-2 text-gray-900 tracking-wide">
                        {familleName}
                      </span>
                    </div>
                    <div className="px-3 pb-1 text-[10px] text-gray-500">Ventes</div>

                    {/* ── Articles */}
                    {famItems.map((item) => (
                      <div key={item.id} className="border-b border-gray-100 px-3 py-1">
                        <div className="flex items-baseline">
                          <span className="flex-1 pl-2 text-[11px] text-gray-800 truncate">
                            {item.nom}
                          </span>
                          <span className="w-16 text-center text-[11px] tabular-nums text-gray-700">
                            {fmt(item.quantite)}
                          </span>
                          <span className="w-20 text-right text-[11px] tabular-nums text-gray-800 font-medium">
                            {fmt(item.prix_unitaire * item.quantite)}
                          </span>
                        </div>
                        {/* Controls discrets */}
                        <div className="mt-1 flex items-center gap-1">
                          <button
                            onClick={() => updateQuantity(item.id, -1)}
                            className="flex h-5 w-5 items-center justify-center border border-gray-200 bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-500 active:scale-90"
                          >
                            <Minus size={9} />
                          </button>
                          <span className="w-5 text-center text-[10px] text-gray-500">{item.quantite}</span>
                          <button
                            onClick={() => updateQuantity(item.id, 1)}
                            className="flex h-5 w-5 items-center justify-center border border-gray-200 bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-800 active:scale-90"
                          >
                            <Plus size={9} />
                          </button>
                          <button
                            onClick={() => removeItem(item.id)}
                            className="ml-1 flex h-5 w-5 items-center justify-center text-gray-300 hover:text-red-400 active:scale-90"
                          >
                            <Trash2 size={9} />
                          </button>
                          <span className="ml-auto text-[10px] text-gray-400 tabular-nums">
                            {fmt(item.prix_unitaire)} / u
                          </span>
                        </div>
                      </div>
                    ))}

                    {/* ── Net Ventes — ligne pointillée */}
                    <div className="flex items-center gap-1 px-3 py-1">
                      <span className="text-[10px] text-gray-600 whitespace-nowrap">Net Ventes</span>
                      <span className="flex-1 border-b border-dotted border-gray-400" />
                    </div>

                    {/* ── Bloc inversé : fond noir, texte blanc */}
                    <div className="bg-black px-3 py-1 mb-3">
                      <div className="flex items-center">
                        <span className="flex-1 text-[10px] text-gray-300 whitespace-nowrap">
                          Net {familleName.toUpperCase()}
                        </span>
                        <span className="w-16 text-center text-[10px] tabular-nums text-gray-300">
                          {fmt(famQty)}
                        </span>
                        <span className="w-20 text-right text-[10px] tabular-nums font-bold text-white">
                          {fmt(famTotal)}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <span className="flex-1 text-[10px] text-gray-400">dont Ventes</span>
                        <span className="w-16 text-center text-[10px] tabular-nums text-gray-400">
                          {fmt(famQty)}
                        </span>
                        <span className="w-20 text-right text-[10px] tabular-nums text-gray-300">
                          {fmt(famTotal)}
                        </span>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Totaux globaux ────────────────────────────────────────────── */}
        {items.length > 0 && (
          <div className="border-t border-dashed border-gray-400 px-3 py-2 font-mono">
            {/* Grand total noir */}
            <div className="mb-2 flex items-center bg-black px-2 py-1.5">
              <span className="flex-1 text-[10px] text-gray-300 uppercase tracking-wide">Net Total</span>
              <span className="w-16 text-center text-[10px] tabular-nums text-gray-300">
                {totalQty.toFixed(2).replace(".", ",")}
              </span>
              <span className="w-20 text-right text-[10px] tabular-nums font-bold text-white">
                {total.toFixed(2).replace(".", ",")}
              </span>
            </div>

            {/* HT */}
            <div className="flex justify-between py-0.5 text-[10px] text-gray-500">
              <span>Total Hors Taxes</span>
              <span className="tabular-nums">{totalHT.toFixed(2).replace(".", ",")}</span>
            </div>

            {/* TVA table */}
            <div className="mt-1 border border-gray-200">
              <div className="grid grid-cols-4 bg-gray-100 text-[9px] font-bold text-gray-500">
                <span className="px-1 py-0.5">Taux</span>
                <span className="px-1 py-0.5 text-right">TVA</span>
                <span className="px-1 py-0.5 text-right">Base HT</span>
                <span className="px-1 py-0.5 text-right">Base TTC</span>
              </div>
              <div className="grid grid-cols-4 text-[9px] text-gray-700">
                <span className="px-1 py-0.5">10.00%</span>
                <span className="px-1 py-0.5 text-right">{totalTVA.toFixed(2)}</span>
                <span className="px-1 py-0.5 text-right">{totalHT.toFixed(2)}</span>
                <span className="px-1 py-0.5 text-right">{total.toFixed(2)}</span>
              </div>
              <div className="grid grid-cols-4 bg-gray-800 text-[9px] font-bold text-white">
                <span className="px-1 py-0.5">Totaux</span>
                <span className="px-1 py-0.5 text-right">{totalTVA.toFixed(2)}</span>
                <span className="px-1 py-0.5 text-right">{totalHT.toFixed(2)}</span>
                <span className="px-1 py-0.5 text-right">{total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}

        {/* ── Action buttons — masqués à l'impression ─────────────────── */}
        <div className="no-print flex flex-col gap-2 border-t border-gray-200 bg-white p-3">
          {/* Test print button */}
          <button
            onClick={() => testPrintFn()}
            className="flex w-full cursor-pointer items-center justify-center gap-2 border border-dashed border-gray-300 py-2 text-xs font-medium text-gray-400 transition-colors hover:border-gray-400 hover:text-gray-600"
          >
            <Printer size={13} />
            Imprimer un exemple (test imprimante)
          </button>

          <div className="flex gap-2">

          {/* Red cancel button */}
          <button
            onClick={clearCart}
            disabled={items.length === 0}
            title="Annuler / Vider le ticket"
            className="flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center border border-red-200 bg-red-50 text-red-500 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <Trash2 size={18} />
          </button>

          {/* Black checkout button */}
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
          </div>{/* end flex gap-2 */}
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
