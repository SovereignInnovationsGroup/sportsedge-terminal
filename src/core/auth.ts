export type StoredAuthUser = {
  email?: string;
  login_id?: string;
  roles?: string[];
  subscription?: { level?: string; status?: string; plan_name?: string; includes_admin_tools?: boolean };
};

export function storedUserIsAdmin(user: StoredAuthUser | null) {
  if (user?.subscription?.includes_admin_tools === true) return true;
  return (user?.roles || []).some((role) => ["admin", "superadmin", "owner"].includes(String(role).toLowerCase()));
}

export function defaultRouteForUser(user: StoredAuthUser | null) {
  return storedUserIsAdmin(user) ? "#admin" : "#dashboard";
}
