import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  Check, BarChart3, ShoppingCart, Package, DollarSign, Shield, Zap,
  AlertTriangle, TrendingUp, Clock, Bell, Eye, Printer, MessageCircle,
  Send, X
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import heroImage from "@/assets/hero-dashboard.jpg";

const features = [
  { icon: ShoppingCart, title: "PDV Rápido e Fácil", desc: "Registre vendas em segundos com combos, descontos e múltiplas formas de pagamento." },
  { icon: Package, title: "Estoque Inteligente", desc: "Alertas automáticos de validade e estoque baixo. Nunca perca produto por falta de controle." },
  { icon: BarChart3, title: "Relatórios Automáticos", desc: "Acompanhe vendas, produtos mais vendidos, melhores horários e margem de lucro." },
  { icon: DollarSign, title: "Financeiro Completo", desc: "Controle despesas, fornecedores e lucro real do seu comércio em tempo real." },
  { icon: Shield, title: "Seguro e Personalizado", desc: "Seus dados isolados e protegidos. Personalize com a marca do seu negócio." },
  { icon: Zap, title: "100% Online", desc: "Acesse de qualquer dispositivo — celular, tablet ou computador. Sem instalação." },
];

const problems = [
  "Não sabe quanto realmente lucrou no dia",
  "Perde produtos por vencimento",
  "Não controla estoque corretamente",
  "Não sabe quais produtos vendem mais",
  "Não controla quanto deve pagar aos fornecedores",
];

const benefitItems = [
  { icon: ShoppingCart, text: "PDV rápido e fácil de usar" },
  { icon: Package, text: "Controle inteligente de estoque" },
  { icon: BarChart3, text: "Relatórios de vendas automáticos" },
  { icon: Printer, text: "Impressão térmica de pedidos" },
  { icon: Clock, text: "Controle de produtos próximos do vencimento" },
  { icon: Bell, text: "Alertas de estoque baixo" },
];

const pricingFeatures = [
  "PDV completo",
  "Controle de estoque com alertas",
  "Relatórios de vendas automáticos",
  "Gestão de fornecedores",
  "Dashboard inteligente",
  "Impressão térmica de pedidos",
  "Controle de validade de produtos",
  "Alertas de estoque baixo",
];

const faqs = [
  { q: "Preciso instalar algo?", a: "Não. O sistema funciona direto no navegador, em qualquer dispositivo." },
  { q: "Funciona no celular?", a: "Sim. Celular, tablet ou computador — acesse de onde quiser." },
  { q: "Preciso entender de tecnologia?", a: "Não. O YouControl foi feito para ser simples e intuitivo." },
  { q: "Posso cancelar quando quiser?", a: "Sim, sem fidelidade e sem burocracia." },
  { q: "Serve para qual tipo de comércio?", a: "Lanchonetes, restaurantes, açaiterias, padarias, mercadinhos e qualquer comércio que precise controlar vendas e estoque." },
];

const Landing = () => {
  const [leadForm, setLeadForm] = useState({ name: "", email: "", whatsapp: "", business_name: "" });
  const [loading, setLoading] = useState(false);

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

  const whatsappMessage = encodeURIComponent("Olá! Quero conhecer o sistema YouControl para meu comércio.");
  const whatsappUrl = `https://wa.me/5571996219021?text=${whatsappMessage}`;

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg gradient-primary" />
            <span className="text-xl font-bold">YouControl</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Funcionalidades</a>
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Preços</a>
            <a href="#faq" className="text-sm text-muted-foreground hover:text-foreground transition-colors">FAQ</a>
            <a href="#contato" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Contato</a>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild><Link to="/login">Entrar</Link></Button>
            <Button asChild><Link to="/register">Testar Grátis</Link></Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 gradient-hero">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-6 animate-fade-in">
              <Zap className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">Gestão completa para seu comércio</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-primary-foreground mb-4 animate-fade-in" style={{ animationDelay: "0.1s" }}>
              Controle total do seu comércio em um <span className="text-gradient">único sistema</span>
            </h1>
            <p className="text-base md:text-lg text-primary-foreground/70 mb-4 max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: "0.15s" }}>
              O YouControl é um sistema completo para gerenciar vendas, estoque, relatórios e pedidos de forma simples e rápida.
            </p>
            <p className="text-sm text-primary-foreground/50 mb-8 animate-fade-in" style={{ animationDelay: "0.2s" }}>
              Experimente o YouControl gratuitamente por 30 dias e descubra como é fácil organizar seu comércio.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in" style={{ animationDelay: "0.25s" }}>
              <Button size="lg" className="text-base px-8 shadow-glow" asChild>
                <Link to="/register">🚀 Teste grátis por 30 dias</Link>
              </Button>
              <Button size="lg" variant="outline" className="text-base px-8 border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10" asChild>
                <a href="#features">Ver funcionalidades</a>
              </Button>
            </div>
            <p className="text-sm text-primary-foreground/50 mt-4 animate-fade-in" style={{ animationDelay: "0.3s" }}>
              Sem cartão de crédito • Cancele quando quiser
            </p>
          </div>
          <div className="max-w-5xl mx-auto animate-fade-in" style={{ animationDelay: "0.4s" }}>
            <div className="rounded-xl overflow-hidden shadow-2xl border border-primary-foreground/10">
              <img src={heroImage} alt="Dashboard YouControl — Sistema de gestão para comércio" className="w-full" />
            </div>
          </div>
        </div>
      </section>

      {/* Problems */}
      <section className="py-24 bg-muted/50">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Seu comércio enfrenta esses problemas?</h2>
          </div>
          <div className="max-w-2xl mx-auto space-y-4 mb-12">
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
            O YouControl resolve tudo isso automaticamente.
          </p>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-24">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Tudo que seu comércio precisa em um só lugar</h2>
          </div>
          <div className="max-w-3xl mx-auto grid sm:grid-cols-2 gap-6">
            {benefitItems.map((b, i) => (
              <div key={i} className="flex items-center gap-4 p-5 rounded-xl border border-border bg-card shadow-card">
                <div className="h-10 w-10 rounded-lg gradient-primary flex items-center justify-center flex-shrink-0">
                  <b.icon className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="font-medium">{b.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 bg-muted/50">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Funcionalidades completas</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Do caixa ao relatório, tudo integrado para você focar no que importa: vender mais.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div key={i} className="p-6 rounded-xl border border-border bg-card shadow-card hover:shadow-glow/20 transition-all duration-300 group">
                <div className="h-12 w-12 rounded-lg gradient-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <f.icon className="h-6 w-6 text-primary-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                <p className="text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Preço simples e transparente</h2>
            <p className="text-muted-foreground text-lg">Sistema completo para gerenciar seu comércio com mais organização e controle.</p>
          </div>
          <div className="max-w-md mx-auto">
            <div className="rounded-2xl border-2 border-primary bg-card p-8 shadow-glow">
              <div className="text-center mb-8">
                <h3 className="text-xl font-bold mb-1">YouControl Profissional</h3>
                <div className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
                  Teste grátis por 30 dias
                </div>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-5xl font-extrabold text-gradient">R$99,90</span>
                  <span className="text-muted-foreground">/mês</span>
                </div>
              </div>
              <ul className="space-y-3 mb-8">
                {pricingFeatures.map((b, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <div className="h-5 w-5 rounded-full gradient-primary flex items-center justify-center flex-shrink-0">
                      <Check className="h-3 w-3 text-primary-foreground" />
                    </div>
                    <span className="text-sm">{b}</span>
                  </li>
                ))}
              </ul>
              <Button className="w-full" size="lg" asChild>
                <Link to="/register">Teste grátis por 30 dias</Link>
              </Button>
              <p className="text-center text-xs text-muted-foreground mt-3">
                Sem fidelidade • Sem cartão de crédito • Cancele quando quiser
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Lead Form */}
      <section id="contato" className="py-24 bg-muted/50">
        <div className="container">
          <div className="max-w-lg mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Quer saber mais?</h2>
              <p className="text-muted-foreground">Preencha seus dados e entraremos em contato.</p>
            </div>
            <form onSubmit={handleLeadSubmit} className="space-y-4 p-8 rounded-2xl border border-border bg-card shadow-card">
              <Input
                placeholder="Seu nome"
                value={leadForm.name}
                onChange={e => setLeadForm(p => ({ ...p, name: e.target.value }))}
                maxLength={100}
              />
              <Input
                type="email"
                placeholder="Seu email"
                value={leadForm.email}
                onChange={e => setLeadForm(p => ({ ...p, email: e.target.value }))}
                maxLength={255}
              />
              <Input
                placeholder="WhatsApp (ex: 11999999999)"
                value={leadForm.whatsapp}
                onChange={e => setLeadForm(p => ({ ...p, whatsapp: e.target.value }))}
                maxLength={20}
              />
              <Input
                placeholder="Nome do seu comércio"
                value={leadForm.business_name}
                onChange={e => setLeadForm(p => ({ ...p, business_name: e.target.value }))}
                maxLength={100}
              />
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
            Experimente o YouControl gratuitamente e descubra como é fácil organizar seu comércio.
          </p>
          <Button size="lg" className="text-base px-10 shadow-glow" asChild>
            <Link to="/register">🚀 Criar conta grátis</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border">
        <div className="container text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="h-6 w-6 rounded-md gradient-primary" />
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
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-[#25D366] flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
        aria-label="Contato via WhatsApp"
      >
        <MessageCircle className="h-7 w-7 text-white" />
      </a>
    </div>
  );
};

export default Landing;