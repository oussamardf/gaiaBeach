"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

// Initialize Supabase Admin client using the Service Role Key to bypass RLS
// and allow Auth Admin operations.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function createUserAction(formData: FormData): Promise<void> {
  const email = formData.get("email")?.toString();
  const password = formData.get("password")?.toString();
  const role = formData.get("role")?.toString();

  if (!email || !password || !role) {
    throw new Error("Tous les champs sont requis.");
  }

  try {
    // 1. Create the user in auth.users
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role },
    });

    if (authError) throw new Error(authError.message);

    if (authData.user) {
      // 2. Insert into the public.profiles table
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .insert({
          id: authData.user.id,
          email: authData.user.email,
          role: role,
        });

      if (profileError) {
        // If profile creation fails, we might want to clean up the auth user or log it
        console.error("Failed to create profile:", profileError);
        throw new Error(profileError.message);
      }
    }

    revalidatePath("/admin/users");
  } catch (error: any) {
    console.error("Action error:", error.message);
  }
}

export async function deleteUserAction(userId: string): Promise<void> {
  try {
    // Deleting from auth.users will automatically cascade to public.profiles
    // if the foreign key is set up with ON DELETE CASCADE.
    // If not, we delete from profiles first.
    await supabaseAdmin.from("profiles").delete().eq("id", userId);

    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw new Error(error.message);

    revalidatePath("/admin/users");
  } catch (error: any) {
    console.error("Action error:", error.message);
  }
}
