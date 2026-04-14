import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const navigate = useNavigate();
  const loginTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;

    // Safety timeout: if session check takes >5s, show form
    const safetyTimer = setTimeout(() => {
      if (!cancelled && checkingSession) {
        console.warn("[Login] Session check timeout — showing form");
        setCheckingSession(false);
      }
    }, 5000);

    const check = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (cancelled) return;
        if (error) {
          try { await supabase.auth.signOut(); } catch {}
          return;
        }
        if (session) {
          const { data: { user }, error: userError } = await supabase.auth.getUser();
          if (cancelled) return;
          if (user && !userError) {
            navigate("/app");
            return;
          }
          try { await supabase.auth.signOut(); } catch {}
        }
      } catch {
        // Ignore — form will show
      } finally {
        if (!cancelled) setCheckingSession(false);
      }
    };

    check();
    return () => {
      cancelled = true;
      clearTimeout(safetyTimer);
    };
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Safety timeout: force loading=false after 10s
    loginTimeoutRef.current = setTimeout(() => {
      setLoading(false);
      toast.error("Tempo de login excedido. Tente novamente.");
    }, 10000);

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error(error.message);
      } else {
        navigate("/app");
      }
    } catch (err: any) {
      toast.error(err?.message || "Erro ao entrar");
    } finally {
      setLoading(false);
      if (loginTimeoutRef.current) {
        clearTimeout(loginTimeoutRef.current);
        loginTimeoutRef.current = null;
      }
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 gradient-hero items-center justify-center p-12">
        <div className="max-w-md">
          <div className="flex items-center gap-2 mb-8">
            <img src="/logo.png" alt="YouControl" className="h-10 w-10 rounded-lg object-contain" />
            <span className="text-2xl font-bold text-primary-foreground">YouControl</span>
          </div>
          <h2 className="text-3xl font-bold text-primary-foreground mb-4">Gerencie seu negócio com facilidade</h2>
          <p className="text-primary-foreground/70">Acesse seu painel e tenha controle total de vendas, estoque e finanças.</p>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <img src="/logo.png" alt="YouControl" className="h-8 w-8 rounded-lg object-contain" />
            <span className="text-xl font-bold">YouControl</span>
          </div>
          <h1 className="text-2xl font-bold mb-2">Bem-vindo de volta</h1>
          <p className="text-muted-foreground mb-8">Entre com suas credenciais</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" required />
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <Label htmlFor="password">Senha</Label>
                <Link to="/forgot-password" className="text-xs font-medium text-primary hover:underline">Esqueceu sua senha?</Link>
              </div>
              <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </form>
          <p className="text-sm text-center mt-6 text-muted-foreground">
            Não tem conta? <Link to="/register" className="text-primary font-medium hover:underline">Cadastre-se</Link>
          </p>
          <p className="text-sm text-center mt-2">
            <Link to="/" className="text-muted-foreground hover:text-foreground">← Voltar ao site</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
