"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Lock } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/");
      router.refresh();
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 font-sans">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-sm border border-gray-200">
        <div className="mb-8 flex flex-col items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-900 text-white mb-4">
            <Lock size={20} />
          </div>
          <h1 className="text-2xl font-bold tracking-widest text-gray-900 uppercase">
            GAIA BEACH
          </h1>
          <p className="text-sm text-gray-500 mt-1">Connexion à votre espace</p>
        </div>

        {error && (
          <div className="mb-6 rounded border border-red-200 bg-red-50 p-3 text-center text-sm text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-700 uppercase tracking-wider">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded border border-gray-300 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-gray-900 focus:bg-white"
              placeholder="votre@email.com"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-700 uppercase tracking-wider">
              Mot de passe
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded border border-gray-300 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-gray-900 focus:bg-white"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-6 flex w-full items-center justify-center rounded bg-gray-900 py-3 text-sm font-bold uppercase tracking-widest text-white transition-colors hover:bg-gray-800 disabled:opacity-50"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : "Se Connecter"}
          </button>
        </form>
      </div>
    </div>
  );
}
