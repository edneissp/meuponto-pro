import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CheckCircle2, KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [recoveryReady, setRecoveryReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    if (hashParams.get("type") === "recovery") {
      setRecoveryReady(true);
    }

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setRecoveryReady(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setRecoveryReady(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Senha redefinida com sucesso.");
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md p-6 shadow-card">
        <div className="mb-6 space-y-2">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {recoveryReady ? <KeyRound className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
          </div>
          <h1 className="text-2xl font-bold">Definir nova senha</h1>
          <p className="text-sm text-muted-foreground">
            {recoveryReady
              ? "Escolha uma nova senha para acessar sua conta."
              : "Abra este link a partir do email de recuperação para redefinir sua senha."}
          </p>
        </div>

        {recoveryReady ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="password">Nova senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                required
              />
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirmar senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a nova senha"
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Salvando..." : "Salvar nova senha"}
            </Button>
          </form>
        ) : (
          <Button variant="outline" className="w-full" asChild>
            <Link to="/forgot-password">Solicitar novo link</Link>
          </Button>
        )}
      </Card>
    </div>
  );
};

export default ResetPassword;
