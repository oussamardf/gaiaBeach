import { createClient } from "@supabase/supabase-js";
import { createUserAction, deleteUserAction } from "@/app/actions/admin-users";
import { Trash2, UserPlus } from "lucide-react";

export default async function AdminUsersPage() {
  // Use Service Role to bypass RLS for fetching the list of users securely in this admin-only page
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Fetch users from public.profiles table
  const { data: profiles, error } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .order("email");

  return (
    <div className="space-y-12">
      {/* ── Formulaire d'ajout ────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6 uppercase tracking-wider">
          Gestion des Utilisateurs
        </h1>
        <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-6">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4 flex items-center gap-2">
            <UserPlus size={16} /> Ajouter un employé
          </h2>
          <form action={createUserAction} className="flex flex-col sm:flex-row items-end gap-4">
            <div className="flex-1 w-full">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Email
              </label>
              <input
                type="email"
                name="email"
                required
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:border-gray-900 text-gray-900"
                placeholder="employe@gaiabeach.com"
              />
            </div>
            <div className="flex-1 w-full">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Mot de passe
              </label>
              <input
                type="password"
                name="password"
                required
                minLength={6}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:border-gray-900 text-gray-900"
                placeholder="••••••••"
              />
            </div>
            <div className="w-full sm:w-48">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Rôle
              </label>
              <select
                name="role"
                required
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:border-gray-900 text-gray-900 bg-white"
              >
                <option value="caisse">Caisse</option>
                <option value="admin">Administrateur</option>
              </select>
            </div>
            <button
              type="submit"
              className="w-full sm:w-auto px-6 py-2 bg-gray-900 text-white text-sm font-bold uppercase tracking-wider rounded hover:bg-gray-800 transition-colors"
            >
              Créer le compte
            </button>
          </form>
        </div>
      </div>

      {/* ── Liste des utilisateurs ────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 shadow-sm rounded-lg overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 border-b border-gray-200 uppercase text-xs font-semibold text-gray-500">
            <tr>
              <th className="px-6 py-4">Email</th>
              <th className="px-6 py-4">Rôle</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {profiles?.map((profile) => (
              <tr key={profile.id} className="hover:bg-gray-50/50">
                <td className="px-6 py-4 font-medium text-gray-900">
                  {profile.email}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${
                      profile.role === "admin"
                        ? "bg-gray-900 text-white"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {profile.role}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <form action={deleteUserAction.bind(null, profile.id)}>
                    <button
                      type="submit"
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors inline-flex"
                      title="Supprimer l'utilisateur"
                      // Optional: A small client component could be used here for confirm() dialog, 
                      // but keeping it simple as requested for server forms.
                    >
                      <Trash2 size={16} />
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {(!profiles || profiles.length === 0) && (
              <tr>
                <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                  {error ? "Erreur de chargement" : "Aucun utilisateur trouvé."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
