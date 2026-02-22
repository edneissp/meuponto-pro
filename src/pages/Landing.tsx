import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Check, BarChart3, ShoppingCart, Package, DollarSign, Shield, Zap } from "lucide-react";
import heroImage from "@/assets/hero-dashboard.jpg";

const features = [
  { icon: ShoppingCart, title: "PDV Intuitivo", desc: "Venda rápido com combos, descontos e múltiplas formas de pagamento." },
  { icon: Package, title: "Estoque Inteligente", desc: "Alertas automáticos de validade e estoque baixo. Nunca perca produto." },
  { icon: BarChart3, title: "Dashboards", desc: "Relatórios de vendas, produtos mais vendidos e melhores horários." },
  { icon: DollarSign, title: "Financeiro", desc: "Controle despesas, fornecedores e margem de lucro em tempo real." },
  { icon: Shield, title: "Multi-tenant", desc: "Cada cliente com seu espaço, dados isolados e marca personalizada." },
  { icon: Zap, title: "100% Web", desc: "Acesse de qualquer dispositivo. Sem instalação, sem complicação." },
];

const benefits = [
  "Cadastro ilimitado de produtos",
  "Controle de estoque com alertas",
  "PDV com suporte a combos e descontos",
  "Relatórios financeiros completos",
  "Dashboard personalizado",
  "Suporte por email",
];

const Landing = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg gradient-primary" />
            <span className="text-xl font-bold">MeuPonto</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Funcionalidades</a>
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Preços</a>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild><Link to="/login">Entrar</Link></Button>
            <Button asChild><Link to="/register">Começar Grátis</Link></Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 gradient-hero">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-6 animate-fade-in">
              <Zap className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">Gestão simplificada para seu negócio</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-primary-foreground mb-6 animate-fade-in" style={{ animationDelay: "0.1s" }}>
              Sua lanchonete no <span className="text-gradient">controle total</span>
            </h1>
            <p className="text-lg md:text-xl text-primary-foreground/70 mb-8 animate-fade-in" style={{ animationDelay: "0.2s" }}>
              Gerencie vendas, estoque, financeiro e muito mais em uma plataforma completa. Simples, rápida e feita para quem vende comida.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in" style={{ animationDelay: "0.3s" }}>
              <Button size="lg" className="text-base px-8 shadow-glow" asChild>
                <Link to="/register">Experimente Agora</Link>
              </Button>
              <Button size="lg" variant="outline" className="text-base px-8 border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10" asChild>
                <a href="#features">Ver Funcionalidades</a>
              </Button>
            </div>
          </div>
          <div className="max-w-5xl mx-auto animate-fade-in" style={{ animationDelay: "0.4s" }}>
            <div className="rounded-xl overflow-hidden shadow-2xl border border-primary-foreground/10">
              <img src={heroImage} alt="Dashboard MeuPonto" className="w-full" />
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Tudo que você precisa</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Do caixa ao relatório, tudo integrado em um só lugar.
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
      <section id="pricing" className="py-24 bg-muted/50">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Preço simples e transparente</h2>
            <p className="text-muted-foreground text-lg">Sem surpresas. Um plano completo para seu negócio.</p>
          </div>
          <div className="max-w-md mx-auto">
            <div className="rounded-2xl border-2 border-primary bg-card p-8 shadow-glow">
              <div className="text-center mb-8">
                <h3 className="text-xl font-bold mb-2">Plano Profissional</h3>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-5xl font-extrabold text-gradient">R$99</span>
                  <span className="text-muted-foreground">/mês</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">Tudo incluso, sem limites</p>
              </div>
              <ul className="space-y-3 mb-8">
                {benefits.map((b, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <div className="h-5 w-5 rounded-full gradient-primary flex items-center justify-center flex-shrink-0">
                      <Check className="h-3 w-3 text-primary-foreground" />
                    </div>
                    <span className="text-sm">{b}</span>
                  </li>
                ))}
              </ul>
              <Button className="w-full" size="lg" asChild>
                <Link to="/register">Assinar Agora</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border">
        <div className="container text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="h-6 w-6 rounded-md gradient-primary" />
            <span className="font-bold">MeuPonto</span>
          </div>
          <p className="text-sm text-muted-foreground">© 2026 MeuPonto. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
