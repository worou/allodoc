import { Component, lazy, Suspense, useEffect, type ReactNode } from "react";
import { BrowserRouter, Outlet, Route, Routes, useLocation, useNavigate } from "react-router";
import { AuthProvider, hasRole, useAuth } from "./components/AuthProvider";
import { MobileNav } from "./components/MobileNav";
import { Footer } from "./components/Footer";
import { Header } from "./components/Header";
import { OfflineBanner } from "./components/OfflineBanner";
import { ErrorState, Loading } from "./components/States";
import { useI18n } from "./lib/i18n";
import Home from "./pages/Home";

// Pages chargées à la demande : le premier écran reste léger sur réseau 3G.
const Country = lazy(() => import("./pages/Country"));
const Search = lazy(() => import("./pages/Search"));
const Practitioner = lazy(() => import("./pages/Practitioner"));
const Booking = lazy(() => import("./pages/Booking"));
const Confirmation = lazy(() => import("./pages/Confirmation"));
const Login = lazy(() => import("./pages/Login"));
const OAuthCallback = lazy(() => import("./pages/OAuthCallback"));
const Account = lazy(() => import("./pages/Account"));
const Pro = lazy(() => import("./pages/Pro"));
const Admin = lazy(() => import("./pages/Admin"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AppDownload = lazy(() => import("./pages/AppDownload"));

/** Une erreur d'affichage (ou un module non téléchargé sur réseau instable) ne doit pas vider toute la page. */
class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) return <PageError />;
    return this.props.children;
  }
}

function PageError() {
  const { t } = useI18n();
  return <ErrorState message={t("error.page")} onRetry={() => window.location.reload()} />;
}

function Layout() {
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Application installée : un praticien qui l'ouvre arrive directement sur son agenda.
  useEffect(() => {
    if (pathname === "/" && search.includes("source=app") && hasRole(user, "ROLE_PRACTITIONER")) {
      navigate("/pro", { replace: true });
    }
  }, [pathname, search, user, navigate]);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <>
      <OfflineBanner />
      <Header />
      <main>
        <ErrorBoundary key={pathname}>
          <Suspense fallback={<Loading />}>
            <Outlet />
          </Suspense>
        </ErrorBoundary>
      </main>
      <Footer />
      <MobileNav />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="recherche" element={<Search />} />
            <Route path="medecin/:slug" element={<Practitioner />} />
            <Route path="rdv/confirmation/:id" element={<Confirmation />} />
            <Route path="rdv/:slug" element={<Booking />} />
            <Route path="connexion" element={<Login />} />
            <Route path="connexion/oauth" element={<OAuthCallback />} />
            <Route path="compte" element={<Account />} />
            <Route path="pro" element={<Pro />} />
            <Route path="admin" element={<Admin />} />
            <Route path="application" element={<AppDownload />} />
            <Route path=":country" element={<Country />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
