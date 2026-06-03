import { http } from "./http";

export type AuthResponse = {
  token: string;
  tenantId: string;
  userId: string;
  role: string;
  userName?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  logoUrl?: string | null;
};

export async function registerTenant(payload: {
  tenantName: string;
  adminName: string;
  email: string;
  password: string;
}) {
  const { data } = await http.post<AuthResponse>("/auth/register-tenant", payload);
  return data;
}

export async function login(payload: { slug: string; email: string; password: string }) {
  const { data } = await http.post<AuthResponse>("/auth/login", payload);
  return data;
}

export function loginBySlug(payload: {
  tenantSlug: string;
  email: string;
  password: string;
}) {
  return http
    .post<AuthResponse>("/auth/login-by-slug", payload)
    .then((r) => r.data);
}