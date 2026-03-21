import { useEffect, useState } from "react";
import { Outlet, useNavigate, Link, useLocation, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { LayoutDashboard, Package, ShoppingCart, DollarSign, BarChart3, Settings, LogOut, Menu, X, Shield, CreditCard, ClipboardList, Truck, PackageCheck, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTenantTheme } from "@/hooks/use-tenant-theme";
import { useDemoSession } from "@/hooks/use-demo-session";
import Subscription from "@/pages/Subscription";
import TrialBanner from "@/components/TrialBanner";
import DemoBanner from "@/components/DemoBanner";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/app" },
  { icon: Package, label: "Produtos", path: "/app/products" },
  { icon: ListChecks, label: "Opcionais", path: "/app/optionals" },
  { icon: ShoppingCart, label: "PDV", path: "/app/pos" },
  { icon: ClipboardList, label: "Pedidos", path: "/app/orders" },
  { icon: Truck, label: "Delivery", path: "/app/delivery" },
  { icon: PackageCheck, label: "Fornecedores", path: "/app/suppliers" },
  { icon: DollarSign, label: "Financeiro", path: "/app/finance" },
  { icon: BarChart3, label: "Relatórios", path: "/app/reports" },
  { icon: Settings, label: "Configurações", path: "/app/settings" },
];

const AppLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tenantName, setTenantName] = useState("MeuPonto");
  const [tenantLogo, setTenantLogo] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [tenantStatus, setTenantStatus] = useState<string | null>(null);
  const [trialDaysLeft, setTrialDaysLeft] = useState<number | null>(null);
  const [tenantPlano, setTenantPlano] = useState<string | null>(null);
  const [tenantOrigin, setTenantOrigin] = useState<string | null>(null);
  const { applyColor } = useTenantTheme();
  const demoSession = useDemoSession(tenantOrigin === "demo");

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("user_id", session.user.id)
        .single();
      if (profile) {
        const { data: tenant } = await supabase
          .from("tenants")
          .select("name, subscription_status, logo_url, trial_end, plano, ativo, primary_color, origin")
          .eq("id", profile.tenant_id)
          .single();
        if (tenant) {
          setTenantName(tenant.name);
          setTenantLogo(tenant.logo_url);
          setTenantPlano((tenant as any).plano || null);
          setTenantOrigin((tenant as any).origin || null);
          applyColor((tenant as any).primary_color || null);

          const plano = (tenant as any).plano as string;
          const trialEnd = (tenant as any).trial_end as string | null;

          if (plano === "trial" && trialEnd) {
            const endDate = new Date(trialEnd);
            const now = new Date();
            const diffMs = endDate.getTime() - now.getTime();
            const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
            setTrialDaysLeft(diffDays);

            if (diffDays < 0) {
              await supabase
                .from("tenants")
                .update({ plano: "expirado", subscription_status: "suspended" })
                .eq("id", profile.tenant_id);
              setTenantStatus("suspended");
              setTenantPlano("expirado");
            } else {
              setTenantStatus(tenant.subscription_status);
            }
          } else {
            setTenantStatus(tenant.subscription_status);
          }
        }
      }
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", "admin");
      setIsAdmin(!!(roles && roles.length > 0));
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") navigate("/login");
    });
    return () => subscription.unsubscribe();
  }, [navigate, applyColor]);

  useEffect(() => {
    if (tenantOrigin === "demo" && demoSession.isExpired) {
      supabase.auth.signOut();
      demoSession.clearSession();
      navigate("/demo-expired");
    }
  }, [tenantOrigin, demoSession.isExpired, navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    if (tenantOrigin === "demo") demoSession.clearSession();
    navigate("/");
  };

  const isBlocked = tenantStatus && !["active", "free", "trial"].includes(tenantStatus) && !isAdmin;
  const isPaymentPage = location.pathname.includes("payment-status");
  const isTrialExpired = tenantPlano === "expirado";

  if ((isBlocked || isTrialExpired) && !isPaymentPage && !isAdmin) {
    return <Subscription blocked tenantName={tenantName} trialExpired={isTrialExpired} />;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-foreground/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={cn(
        "fixed lg:static inset-y-0 left-0 z-50 w-64 flex flex-col bg-sidebar border-r border-sidebar-border transition-transform duration-300 lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center justify-between h-16 px-4 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            {tenantLogo ? (
              <img src={tenantLogo} alt={tenantName} className="h-8 w-8 rounded-lg object-cover" />
            ) : (
              <div className="h-8 w-8 rounded-lg bg-primary" />
            )}
            <span className="font-bold text-sidebar-foreground truncate">{tenantName}</span>
          </div>
          <Button variant="ghost" size="icon" className="lg:hidden text-sidebar-foreground" onClick={() => setSidebarOpen(false)}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
          {isAdmin && (
            <Link
              to="/admin"
              onClick={() => setSidebarOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                location.pathname === "/admin"
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <Shield className="h-5 w-5" />
              Admin
            </Link>
          )}
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground w-full transition-colors"
          >
            <LogOut className="h-5 w-5" />
            Sair
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-border flex items-center px-4 lg:px-6 bg-card">
          <Button variant="ghost" size="icon" className="lg:hidden mr-2" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">
            {navItems.find(n => n.path === location.pathname)?.label || "MeuPonto"}
          </h1>
        </header>
        {tenantOrigin === "demo" && !demoSession.isExpired && (
          <DemoBanner remainingMinutes={demoSession.remainingMinutes} />
        )}
        {tenantPlano === "trial" && trialDaysLeft !== null && trialDaysLeft <= 7 && trialDaysLeft >= 0 && (
          <TrialBanner daysLeft={trialDaysLeft} />
        )}
        <main className="flex-1 overflow-auto p-4 lg:p-6 bg-background">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;