"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase, type Article, type Famille } from "@/lib/supabase";
import { Loader2, Trash2, Edit2, Plus, X, Check, CheckCircle, AlertCircle } from "lucide-react";

export default function AdminMenuPage() {
  const [familles, setFamilles] = useState<Famille[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  // States for forms
  const [editingFamille, setEditingFamille] = useState<Famille | null>(null);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [newFamille, setNewFamille] = useState<{ nom: string; ordre_affichage: number } | null>(null);
  const [newArticle, setNewArticle] = useState<{ nom: string; prix_unitaire: number; famille_id: number; est_actif: boolean } | null>(null);

  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showToast = useCallback((type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [{ data: fData, error: fErr }, { data: aData, error: aErr }] = await Promise.all([
      supabase.from("familles").select("*").order("ordre_affichage").order("nom"),
      supabase.from("articles").select("*").order("nom"),
    ]);

    if (fErr || aErr) {
      showToast("error", "Erreur lors du chargement des données");
    } else {
      setFamilles(fData || []);
      setArticles(aData || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // --- CRUD FAMILLES ---
  const handleAddFamille = async () => {
    if (!newFamille?.nom) return;
    const { error } = await supabase.from("familles").insert({ nom: newFamille.nom, ordre_affichage: newFamille.ordre_affichage });
    if (error) showToast("error", error.message);
    else { showToast("success", "Famille ajoutée"); setNewFamille(null); loadData(); }
  };

  const handleUpdateFamille = async () => {
    if (!editingFamille?.nom) return;
    const { error } = await supabase.from("familles").update({ nom: editingFamille.nom, ordre_affichage: editingFamille.ordre_affichage }).eq("id", editingFamille.id);
    if (error) showToast("error", error.message);
    else { showToast("success", "Famille modifiée"); setEditingFamille(null); loadData(); }
  };

  const handleDeleteFamille = async (id: number) => {
    if (!confirm("Voulez-vous vraiment supprimer cette famille ? Les articles associés pourraient être orphelins.")) return;
    const { error } = await supabase.from("familles").delete().eq("id", id);
    if (error) showToast("error", error.message);
    else { showToast("success", "Famille supprimée"); loadData(); }
  };

  // --- CRUD ARTICLES ---
  const handleAddArticle = async () => {
    if (!newArticle?.nom || !newArticle.famille_id) return;
    const { error } = await supabase.from("articles").insert(newArticle);
    if (error) showToast("error", error.message);
    else { showToast("success", "Article ajouté"); setNewArticle(null); loadData(); }
  };

  const handleUpdateArticle = async () => {
    if (!editingArticle?.nom || !editingArticle.famille_id) return;
    const { error } = await supabase.from("articles").update(editingArticle).eq("id", editingArticle.id);
    if (error) showToast("error", error.message);
    else { showToast("success", "Article modifié"); setEditingArticle(null); loadData(); }
  };

  const handleDeleteArticle = async (id: number) => {
    if (!confirm("Voulez-vous vraiment supprimer cet article ?")) return;
    const { error } = await supabase.from("articles").delete().eq("id", id);
    if (error) showToast("error", error.message);
    else { showToast("success", "Article supprimé"); loadData(); }
  };

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 size={32} className="animate-spin text-gray-400" /></div>;
  }

  const getFamilleName = (id: number) => familles.find((f) => f.id === id)?.nom || "Inconnue";

  return (
    <div className="space-y-12">
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900 uppercase tracking-wider">Gestion des Familles</h1>
          {!newFamille && (
            <button onClick={() => setNewFamille({ nom: "", ordre_affichage: 0 })} className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-semibold rounded hover:bg-gray-800 transition-colors shadow-sm">
              <Plus size={16} /> Ajouter une famille
            </button>
          )}
        </div>
        <div className="bg-white border border-gray-200 shadow-sm rounded-lg overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 border-b border-gray-200 uppercase text-xs font-semibold text-gray-500">
              <tr>
                <th className="px-6 py-4">Nom de la famille</th>
                <th className="px-6 py-4">Ordre d'affichage</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {newFamille && (
                <tr className="bg-gray-50/50">
                  <td className="px-6 py-4">
                    <input
                      type="text"
                      placeholder="Nouvelle famille..."
                      value={newFamille.nom}
                      onChange={(e) => setNewFamille({ ...newFamille, nom: e.target.value })}
                      className="w-full border border-gray-300 rounded px-2 py-1 outline-none focus:border-gray-900 text-gray-900 bg-white"
                      autoFocus
                    />
                  </td>
                  <td className="px-6 py-4">
                    <input
                      type="number"
                      value={newFamille.ordre_affichage}
                      onChange={(e) => setNewFamille({ ...newFamille, ordre_affichage: parseInt(e.target.value) || 0 })}
                      className="w-20 border border-gray-300 rounded px-2 py-1 outline-none focus:border-gray-900 text-gray-900 bg-white"
                    />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={handleAddFamille} className="p-1.5 text-green-600 hover:bg-green-50 rounded"><Check size={16} /></button>
                      <button onClick={() => setNewFamille(null)} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded"><X size={16} /></button>
                    </div>
                  </td>
                </tr>
              )}
              {familles.map((famille) => (
                <tr key={famille.id} className="hover:bg-gray-50/50">
                  <td className="px-6 py-4">
                    {editingFamille?.id === famille.id ? (
                      <input
                        type="text"
                        value={editingFamille.nom}
                        onChange={(e) => setEditingFamille({ ...editingFamille, nom: e.target.value })}
                        className="w-full border border-gray-300 rounded px-2 py-1 outline-none focus:border-gray-900 text-gray-900"
                      />
                    ) : (
                      <span className="font-medium text-gray-900">{famille.nom}</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {editingFamille?.id === famille.id ? (
                      <input
                        type="number"
                        value={editingFamille.ordre_affichage}
                        onChange={(e) => setEditingFamille({ ...editingFamille, ordre_affichage: parseInt(e.target.value) || 0 })}
                        className="w-20 border border-gray-300 rounded px-2 py-1 outline-none focus:border-gray-900 text-gray-900"
                      />
                    ) : (
                      <span className="text-gray-600">{famille.ordre_affichage}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {editingFamille?.id === famille.id ? (
                      <div className="flex justify-end gap-2">
                        <button onClick={handleUpdateFamille} className="p-1.5 text-green-600 hover:bg-green-50 rounded"><Check size={16} /></button>
                        <button onClick={() => setEditingFamille(null)} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded"><X size={16} /></button>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setEditingFamille(famille)} className="p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900 rounded"><Edit2 size={16} /></button>
                        <button onClick={() => handleDeleteFamille(famille.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded"><Trash2 size={16} /></button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900 uppercase tracking-wider">Gestion des Articles</h1>
          {!newArticle && (
            <button 
              onClick={() => setNewArticle({ nom: "", prix_unitaire: 0, famille_id: familles[0]?.id || 0, est_actif: true })} 
              disabled={familles.length === 0}
              title={familles.length === 0 ? "Créez d'abord une famille" : ""}
              className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-semibold rounded hover:bg-gray-800 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus size={16} /> Ajouter un article
            </button>
          )}
        </div>
        <div className="bg-white border border-gray-200 shadow-sm rounded-lg overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 border-b border-gray-200 uppercase text-xs font-semibold text-gray-500">
              <tr>
                <th className="px-6 py-4">Nom de l'article</th>
                <th className="px-6 py-4">Famille</th>
                <th className="px-6 py-4">Prix unitaire (€)</th>
                <th className="px-6 py-4 text-center">Actif</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {newArticle && (
                <tr className="bg-gray-50/50">
                  <td className="px-6 py-4">
                    <input
                      type="text"
                      placeholder="Nouvel article..."
                      value={newArticle.nom}
                      onChange={(e) => setNewArticle({ ...newArticle, nom: e.target.value })}
                      className="w-full border border-gray-300 rounded px-2 py-1 outline-none focus:border-gray-900 text-gray-900 bg-white"
                      autoFocus
                    />
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={newArticle.famille_id}
                      onChange={(e) => setNewArticle({ ...newArticle, famille_id: parseInt(e.target.value) })}
                      className="border border-gray-300 rounded px-2 py-1 outline-none focus:border-gray-900 text-gray-900 bg-white"
                    >
                      {familles.map((f) => <option key={f.id} value={f.id}>{f.nom}</option>)}
                    </select>
                  </td>
                  <td className="px-6 py-4">
                    <input
                      type="number"
                      step="0.01"
                      value={newArticle.prix_unitaire}
                      onChange={(e) => setNewArticle({ ...newArticle, prix_unitaire: parseFloat(e.target.value) || 0 })}
                      className="w-24 border border-gray-300 rounded px-2 py-1 outline-none focus:border-gray-900 text-gray-900 bg-white"
                    />
                  </td>
                  <td className="px-6 py-4 text-center">
                    <input
                      type="checkbox"
                      checked={newArticle.est_actif}
                      onChange={(e) => setNewArticle({ ...newArticle, est_actif: e.target.checked })}
                      className="accent-gray-900 w-4 h-4"
                    />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={handleAddArticle} className="p-1.5 text-green-600 hover:bg-green-50 rounded"><Check size={16} /></button>
                      <button onClick={() => setNewArticle(null)} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded"><X size={16} /></button>
                    </div>
                  </td>
                </tr>
              )}
              {articles.map((article) => (
                <tr key={article.id} className="hover:bg-gray-50/50">
                  <td className="px-6 py-4">
                    {editingArticle?.id === article.id ? (
                      <input
                        type="text"
                        value={editingArticle.nom}
                        onChange={(e) => setEditingArticle({ ...editingArticle, nom: e.target.value })}
                        className="w-full border border-gray-300 rounded px-2 py-1 outline-none focus:border-gray-900 text-gray-900"
                      />
                    ) : (
                      <span className="font-medium text-gray-900">{article.nom}</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {editingArticle?.id === article.id ? (
                      <select
                        value={editingArticle.famille_id}
                        onChange={(e) => setEditingArticle({ ...editingArticle, famille_id: parseInt(e.target.value) })}
                        className="border border-gray-300 rounded px-2 py-1 outline-none focus:border-gray-900 text-gray-900 bg-white"
                      >
                        {familles.map((f) => <option key={f.id} value={f.id}>{f.nom}</option>)}
                      </select>
                    ) : (
                      <span className="text-gray-600 bg-gray-100 px-2.5 py-1 rounded-full text-xs font-medium">{getFamilleName(article.famille_id)}</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {editingArticle?.id === article.id ? (
                      <input
                        type="number"
                        step="0.01"
                        value={editingArticle.prix_unitaire}
                        onChange={(e) => setEditingArticle({ ...editingArticle, prix_unitaire: parseFloat(e.target.value) || 0 })}
                        className="w-24 border border-gray-300 rounded px-2 py-1 outline-none focus:border-gray-900 text-gray-900"
                      />
                    ) : (
                      <span className="text-gray-900 font-semibold">{article.prix_unitaire.toFixed(2)}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {editingArticle?.id === article.id ? (
                      <input
                        type="checkbox"
                        checked={editingArticle.est_actif}
                        onChange={(e) => setEditingArticle({ ...editingArticle, est_actif: e.target.checked })}
                        className="accent-gray-900 w-4 h-4"
                      />
                    ) : (
                      <span className={`inline-block w-2.5 h-2.5 rounded-full ${article.est_actif ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {editingArticle?.id === article.id ? (
                      <div className="flex justify-end gap-2">
                        <button onClick={handleUpdateArticle} className="p-1.5 text-green-600 hover:bg-green-50 rounded"><Check size={16} /></button>
                        <button onClick={() => setEditingArticle(null)} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded"><X size={16} /></button>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setEditingArticle(article)} className="p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900 rounded"><Edit2 size={16} /></button>
                        <button onClick={() => handleDeleteArticle(article.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded"><Trash2 size={16} /></button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {toast && (
        <div className={`fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded px-5 py-2.5 text-sm font-medium shadow-lg ${toast.type === "success" ? "bg-gray-900 text-white" : "bg-red-600 text-white"}`}>
          {toast.type === "success" ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
          {toast.message}
        </div>
      )}
    </div>
  );
}
