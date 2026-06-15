export type AuthState = {
  token: string | null;
  tenantId: string | null;
  tenantSlug?: string | null;
  userId: string | null;
  role: string | null;
  userName?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  logoUrl?: string | null;
  planName?: string | null;
  features?: string[] | null;
  emailVerified?: boolean;
  groupName?: string | null;
};

export const authStore = {
  set(data: AuthState) {
    localStorage.setItem("auth", JSON.stringify(data));
  },
  get(): AuthState {
    const raw = localStorage.getItem("auth");
    return raw
      ? (JSON.parse(raw) as AuthState)
      : {
          token: null,
          tenantId: null,
          tenantSlug: null,
          userId: null,
          role: null,
          userName: null,
          primaryColor: null,    
          secondaryColor: null,  
          logoUrl: null,    
          groupName: null,     
        };
  },
  getToken() {
    return this.get().token;
  },
  getTenantSlug() {
    return this.get().tenantSlug ?? null;
  },
  clear() {
    localStorage.removeItem("auth");
  },
};