import type { User } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";

export type AppRole = "admin" | "user";

function normalizeRole(value: unknown): AppRole {
  if (typeof value !== "string") return "user";
  return value.trim().toLowerCase() === "admin" ? "admin" : "user";
}

export async function getUserRole(userId: string): Promise<AppRole> {
  if (!userId) return "user";

  const { data, error } = await supabaseService.from("profiles").select("role").eq("id", userId).maybeSingle();
  if (error) return "user";

  const roleValue = data && typeof data === "object" ? (data as Record<string, unknown>).role : null;
  return normalizeRole(roleValue);
}

export async function getCurrentUserAndRole(): Promise<{
  user: User | null;
  role: AppRole;
  isAdmin: boolean;
}> {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, role: "user", isAdmin: false };
  }

  const role = await getUserRole(user.id);
  return { user, role, isAdmin: role === "admin" };
}
