import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Enviamos o link de recuperação para seu email.");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md p-6 shadow-card">
        <div className="mb-6 space-y-2">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Mail className="h-5 w-5" />
          </div>
          <h1 className="text-2xl font-bold">Recuperar senha</h1>
          <p className="text-sm text-muted-foreground">Digite seu email para receber um link de redefinição.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Enviando..." : "Enviar link de recuperação"}
          </Button>
        </form>

        <Button variant="link" className="mt-4 px-0" asChild>
          <Link to="/login">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para o login
          </Link>
        </Button>
      </Card>
    </div>
  );
};

export default ForgotPassword;
