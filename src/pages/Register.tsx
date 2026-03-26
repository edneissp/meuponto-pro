import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle, FlaskConical, Zap } from "lucide-react";

const trialBenefits = [
  "30 dias grátis — sem cartão de crédito",
  "PDV completo e controle de estoque",
  "Relatórios e dashboard de vendas",
  "Impressão térmica de pedidos",
];

const Register = () => {
  const [fullName, setFullName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const origin = useMemo(() => (searchParams.get("origin") === "demo" ? "demo" : "direct"), [searchParams]);
  const isFromDemo = origin === "demo";

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, business_name: businessName, origin },
        emailRedirectTo: window.location.origin,
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Conta criada! Verifique seu email para confirmar.");
      navigate("/login");
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 gradient-hero items-center justify-center p-12">
        <div className="max-w-md">
          <div className="flex items-center gap-2 mb-8">
            <img src="/logo.png" alt="YouControl" className="h-10 w-10 rounded-lg object-contain" />
            <span className="text-2xl font-bold text-primary-foreground">YouControl</span>
          </div>
          <h2 className="text-3xl font-bold text-primary-foreground mb-4">Teste grátis por 30 dias</h2>
          <p className="text-primary-foreground/70 mb-8">
            Experimente o YouControl por 30 dias grátis. Sistema completo para lanchonetes, restaurantes e açaiterias.
          </p>
          <ul className="space-y-3">
            {trialBenefits.map((b) => (
              <li key={b} className="flex items-center gap-3 text-primary-foreground/80">
                <CheckCircle className="h-5 w-5 text-primary shrink-0" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-4">
            <div className="h-8 w-8 rounded-lg gradient-primary" />
            <span className="text-xl font-bold">YouControl</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
              <Zap className="h-3 w-3" />
              30 dias grátis
            </div>
            {isFromDemo && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent text-accent-foreground text-xs font-medium">
                <FlaskConical className="h-3 w-3" />
                Veio da DEMO
              </div>
            )}
          </div>
          <h1 className="text-2xl font-bold mb-2">Criar conta grátis</h1>
          <p className="text-muted-foreground mb-6">
            {isFromDemo
              ? "Sua conta real será criada com um novo ambiente e trial de 30 dias ativado automaticamente."
              : "Comece seu teste grátis de 30 dias — sem cartão de crédito"}
          </p>
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <Label htmlFor="fullName">Seu nome</Label>
              <Input id="fullName" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="João Silva" required />
            </div>
            <div>
              <Label htmlFor="businessName">Nome do estabelecimento</Label>
              <Input id="businessName" value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder="Lanchonete do João" required />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" required />
            </div>
            <div>
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" required />
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? "Criando..." : "Começar teste grátis"}
            </Button>
          </form>
          <p className="text-xs text-center mt-4 text-muted-foreground">
            Sem cartão de crédito • Cancele quando quiser
          </p>
          <p className="text-sm text-center mt-4 text-muted-foreground">
            Já tem conta? <Link to="/login" className="text-primary font-medium hover:underline">Entrar</Link>
          </p>
          <p className="text-sm text-center mt-2">
            <Link to="/" className="text-muted-foreground hover:text-foreground">← Voltar ao site</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
