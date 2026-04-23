
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  Zap, MessageCircle, X, FlaskConical, Send, ShoppingCart, Package,
  Utensils, ChefHat, DollarSign, FileText
} from "lucide-react";
import { toast } from "sonner";
import { startDemoSession } from "@/lib/demo";
import heroImage from "@/assets/hero-dashboard.jpg";
import { BenefitsGrid } from "@/components/landing/BenefitsGrid";
import { FiscalBlock } from "@/components/landing/FiscalBlock";
import { PricingBlock } from "@/components/landing/PricingBlock";

const problems = [
  "Não sabe quanto realmente lucrou no dia",
  "Perde produtos por vencimento",
  "Não controla estoque corretamente",
  "Não sabe quais produtos vendem mais",
  "Demora para fechar mesas e cobrar clientes",
  "Não emite nota fiscal de forma simples",
];

const heroHighlights = [
  { icon: ShoppingCart, label: "PDV" },
  { icon: Package, label: "Estoque" },
  { icon: Utensils, label: "Mesas" },
  { icon: ChefHat, label: "Cozinha" },
  { icon: DollarSign, label: "Financeiro" },
  { icon: FileText, label: "NF-e / NFC-e" },
];

const faqs = [
  { q: "Preciso instalar algo?", a: "Não. O sistema funciona direto no navegador, em qualquer dispositivo." },
  { q: "Funciona no celular?", a: "Sim. Celular, tablet ou computador — acesse de onde quiser." },
  { q: "O sistema emite NF-e e NFC-e?", a: "Sim. Temos módulo fiscal integrado com emissão direta do PDV, histórico e download de XML/PDF." },
  { q: "Posso cancelar quando quiser?", a: "Sim, sem fidelidade e sem burocracia." },
  { q: "Serve para qual tipo de comércio?", a: "Restaurantes, lanchonetes, açaiterias, padarias, mercadinhos e qualquer comércio que precise de PDV, estoque e fiscal." },
  { q: "Como funciona o cupom PRIMEIROS100?", a: "Os 100 primeiros clientes pagam apenas R$ 69,90/mês durante 12 meses. Após esse período, o valor passa a ser R$ 119,90/mês." },
];

const Landing = () => {
  const [leadForm, setLeadForm] = useState({ name: "", email: "", whatsapp: "", business_name: "" });
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate("/app");
    });
  }, [navigate]);

  const handleStartDemo = () => {
    setDemoLoading(true);
    startDemoSession();
    navigate("/app?demo=true");
  };

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadForm.name || !leadForm.email || !leadForm.whatsapp || !leadForm.business_name) {
      toast.error("Preencha todos os campos.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("leads").insert({
      name: leadForm.name.trim(),
      email: leadForm.email.trim(),
      whatsapp: leadForm.whatsapp.trim(),
      business_name: leadForm.business_name.trim(),
    });
    setLoading(false);
    if (error) {
      toast.error("Erro ao enviar. Tente novamente.");
    } else {
      toast.success("Dados enviados com sucesso! Entraremos em contato.");
      setLeadForm({ name: "", email: "", whatsapp: "", business_name: "" });
    }
  };

  const whatsappMessage = encodeURIComponent(
  "Olá! Vim pelo site e quero testar o sistema YouControl. Pode me explicar como funciona?"
);
  const whatsappUrl = `https://wa.me/5571983694848?text=${whatsappMessage}`;

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="YouControl" className="h-8 w-8 rounded-lg object-contain" />
            <span className="text-xl font-bold">YouControl</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#beneficios" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Benefícios</a>
            <a href="#fiscal" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Fiscal</a>
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Preços</a>
            <a href="#faq" className="text-sm text-muted-foreground hover:text-foreground transition-colors">FAQ</a>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Button variant="ghost" size="sm" asChild className="px-2 sm:px-4"><Link to="/login">Entrar</Link></Button>
            <Button size="sm" asChild className="px-3 sm:px-4 text-xs sm:text-sm"><Link to="/register">Teste grátis</Link></Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 gradient-hero">
        <div className="container">
          <div className="max-w-4xl mx-auto text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-6 animate-fade-in">
              <Zap className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">Sistema completo para restaurantes</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-primary-foreground mb-6 animate-fade-in" style={{ animationDelay: "0.1s" }}>
              PDV, Estoque, Mesas, Cozinha, Financeiro e <span className="text-gradient">NF-e / NFC-e</span> em um só sistema
            </h1>
            <p className="text-base md:text-lg text-primary-foreground/70 mb-6 max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: "0.15s" }}>
              Gerencie todo o seu restaurante ou comércio em uma plataforma completa. Emita notas fiscais, controle mesas e cozinha em tempo real.
            </p>

            {/* Hero feature pills */}
            <div className="flex flex-wrap justify-center gap-2 mb-8 animate-fade-in" style={{ animationDelay: "0.2s" }}>
              {heroHighlights.map((h, i) => (
                <div key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary-foreground/10 border border-primary-foreground/20 text-primary-foreground/90 text-xs font-medium backdrop-blur-sm">
                  <h.icon className="h-3.5 w-3.5" />
                  {h.label}
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in" style={{ animationDelay: "0.25s" }}>
              <Button size="lg" className="text-base px-8 shadow-glow" asChild>
                <Link to="/register">🚀 Teste grátis agora</Link>
              </Button>
              <Button size="lg" variant="outline" className="text-base px-8 border-2 border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground" onClick={handleStartDemo} disabled={demoLoading}>
                <FlaskConical className="mr-2 h-5 w-5" />
                {demoLoading ? "Preparando..." : "Ver demonstração"}
              </Button>
            </div>
            <p className="text-sm text-primary-foreground/50 mt-4 animate-fade-in" style={{ animationDelay: "0.3s" }}>
              Sem cartão de crédito • 30 dias grátis • Cancele quando quiser
            </p>
          </div>
          <div className="max-w-5xl mx-auto animate-fade-in" style={{ animationDelay: "0.4s" }}>
            <div className="rounded-xl overflow-hidden shadow-2xl border border-primary-foreground/10">
              <img src={heroImage} alt="Dashboard YouControl — Sistema de gestão para restaurantes e comércio" className="w-full" />
            </div>
          </div>
        </div>
      </section>

      {/* Problems */}
      <section className="py-24 bg-muted/50">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Seu restaurante enfrenta esses problemas?</h2>
          </div>
          <div className="max-w-2xl mx-auto space-y-3 mb-12">
            {problems.map((p, i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-xl border border-destructive/20 bg-destructive/5">
                <div className="h-8 w-8 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
                  <X className="h-4 w-4 text-destructive" />
                </div>
                <span className="text-foreground font-medium">{p}</span>
              </div>
            ))}
          </div>
          <p className="text-center text-xl md:text-2xl font-bold text-gradient">
            O YouControl resolve tudo isso em uma única plataforma.
          </p>
        </div>
      </section>

      {/* Benefits Grid */}
      <div id="beneficios">
        <BenefitsGrid />
      </div>

      {/* Fiscal Block */}
      <div id="fiscal">
        <FiscalBlock />
      </div>

      {/* Pricing */}
      <PricingBlock />

      {/* Lead Form */}
      <section id="contato" className="py-24 bg-muted/50">
        <div className="container">
          <div className="max-w-lg mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Quer saber mais?</h2>
              <p className="text-muted-foreground">Preencha seus dados e nossa equipe entrará em contato.</p>
            </div>
            <form onSubmit={handleLeadSubmit} className="space-y-4 p-8 rounded-2xl border border-border bg-card shadow-card">
              <Input placeholder="Seu nome" value={leadForm.name} onChange={e => setLeadForm(p => ({ ...p, name: e.target.value }))} maxLength={100} />
              <Input type="email" placeholder="Seu email" value={leadForm.email} onChange={e => setLeadForm(p => ({ ...p, email: e.target.value }))} maxLength={255} />
              <Input placeholder="WhatsApp (ex: 11999999999)" value={leadForm.whatsapp} onChange={e => setLeadForm(p => ({ ...p, whatsapp: e.target.value }))} maxLength={20} />
              <Input placeholder="Nome do seu comércio" value={leadForm.business_name} onChange={e => setLeadForm(p => ({ ...p, business_name: e.target.value }))} maxLength={100} />
              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? "Enviando..." : "Enviar"}
                {!loading && <Send className="ml-2 h-4 w-4" />}
              </Button>
            </form>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Perguntas Frequentes</h2>
          </div>
          <div className="max-w-2xl mx-auto">
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, i) => (
                <AccordionItem key={i} value={`faq-${i}`}>
                  <AccordionTrigger className="text-left">{faq.q}</AccordionTrigger>
                  <AccordionContent>{faq.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 gradient-hero">
        <div className="container text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4">Comece agora — é grátis por 30 dias</h2>
          <p className="text-primary-foreground/70 text-lg max-w-xl mx-auto mb-8">
            Use o cupom <span className="font-bold text-primary-foreground">PRIMEIROS100</span> e pague apenas R$ 39,90/mês por 12 meses.
          </p>
          <Button size="lg" className="text-base px-10 shadow-glow" asChild>
            <Link to="/register">🚀 Teste grátis agora</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border">
        <div className="container text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <img src="/logo.png" alt="YouControl" className="h-6 w-6 rounded-md object-contain" />
            <span className="font-bold">YouControl</span>
          </div>
          <p className="text-sm text-muted-foreground">© 2026 YouControl. Todos os direitos reservados.</p>
        </div>
      </footer>

      {/* WhatsApp Floating Button */}
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 pl-4 pr-5 py-3 rounded-full bg-[#25D366] text-white shadow-lg hover:scale-105 transition-transform font-semibold"
        aria-label="Quero testar agora — Contato via WhatsApp"
      >
        <MessageCircle className="h-5 w-5" />
        <span className="hidden sm:inline text-sm">Quero testar agora</span>
      </a>
    </div>
  );
};

export default Landing;
