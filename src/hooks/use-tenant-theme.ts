import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

function hexToHSL(hex: string): string | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;

  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function adjustLightness(hsl: string, targetL: number): string {
  const parts = hsl.split(" ");
  return `${parts[0]} ${parts[1]} ${targetL}%`;
}

export function useTenantTheme() {
  const [tenantColor, setTenantColor] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("user_id", session.user.id)
        .single();
      if (!profile) return;

      const { data: tenant } = await supabase
        .from("tenants")
        .select("primary_color")
        .eq("id", profile.tenant_id)
        .single();

      if (tenant?.primary_color) {
        setTenantColor(tenant.primary_color);
        applyColor(tenant.primary_color);
      }
    };
    load();
  }, []);

  const applyColor = (hex: string) => {
    const hsl = hexToHSL(hex);
    if (!hsl) return;

    const root = document.documentElement;
    root.style.setProperty("--primary", hsl);
    root.style.setProperty("--ring", hsl);
    root.style.setProperty("--sidebar-primary", hsl);
    root.style.setProperty("--sidebar-ring", hsl);

    // Accent derived from primary
    const accentLight = adjustLightness(hsl, 95);
    const accentDark = adjustLightness(hsl, 18);
    const accentFgLight = adjustLightness(hsl, 40);
    const accentFgDark = adjustLightness(hsl, 70);

    const isDark = root.classList.contains("dark");
    root.style.setProperty("--accent", isDark ? accentDark : accentLight);
    root.style.setProperty("--accent-foreground", isDark ? accentFgDark : accentFgLight);
  };

  return { tenantColor, applyColor };
}
