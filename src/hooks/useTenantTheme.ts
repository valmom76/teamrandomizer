import { useEffect } from 'react';
import { authStore } from '../auth/store';

export function useTenantTheme() {
  useEffect(() => {
    const auth = authStore.get();
    const root = document.documentElement;
    if (auth.primaryColor) root.style.setProperty('--primary-color', auth.primaryColor);
    if (auth.secondaryColor) root.style.setProperty('--bg-color', auth.secondaryColor);
  }, []);
}