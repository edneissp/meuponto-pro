import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { TenantProvider } from "./contexts/TenantContext";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import DemoExpired from "./pages/DemoExpired";
import AdminPanel from "./pages/AdminPanel";
import AdminPromotions from "./pages/AdminPromotions";
import AppLayout from "./components/AppLayout";
import Subscription from "./pages/Subscription";
import PaymentStatus from "./pages/PaymentStatus";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import POS from "./pages/POS";
import Finance from "./pages/Finance";
import Reports from "./pages/Reports";
import AppSettings from "./pages/AppSettings";
import Orders from "./pages/Orders";
import Tables from "./pages/Tables";
import Delivery from "./pages/Delivery";
import DigitalMenu from "./pages/DigitalMenu";
import SupplierDeliveries from "./pages/SupplierDeliveries";
import Optionals from "./pages/Optionals";
import Kitchen from "./pages/Kitchen";
import FiscalPage from "./pages/Fiscal";
import NotFound from "./pages/NotFound";



const App = () => (
  <QueryClientProvider client={queryClient}>
    <TenantProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/demo-expired" element={<DemoExpired />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="/admin/promotions" element={<AdminPromotions />} />
          <Route path="/subscription" element={<Subscription />} />
          <Route path="/menu/:tenantId" element={<DigitalMenu />} />
          <Route path="/app" element={<AppLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="products" element={<Products />} />
            <Route path="pos" element={<POS />} />
            <Route path="orders" element={<Orders />} />
            <Route path="tables" element={<Tables />} />
            <Route path="delivery" element={<Delivery />} />
            <Route path="suppliers" element={<SupplierDeliveries />} />
            <Route path="optionals" element={<Optionals />} />
            <Route path="kitchen" element={<Kitchen />} />
            <Route path="fiscal" element={<FiscalPage />} />
            <Route path="finance" element={<Finance />} />
            <Route path="reports" element={<Reports />} />
            <Route path="settings" element={<AppSettings />} />
            <Route path="payment-status" element={<PaymentStatus />} />
            <Route path="subscription" element={<Subscription />} />
          </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </TenantProvider>
  </QueryClientProvider>
);

export default App;
