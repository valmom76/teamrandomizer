import { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Layout } from "antd";
import Nav from "./components/Nav";
import RequireAuth from "./auth/RequireAuth";
import { authStore } from "./auth/store";

import Login from "./pages/Login";
import SignupTenant from "./pages/SignupTenant";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import Dashboard from "./pages/Dashboard";
import Skills from "./pages/Skills";
import Players from "./pages/Players";
import PlayerRatings from "./pages/PlayerRatings";
import TeamGenerator from "./pages/TeamGenerator";
import ChampionshipsPage from "./pages/ChampionshipsPage";
import ChampionshipDetailPage from "./pages/ChampionshipDetailPage";
import ManualTeamPage from "./pages/ManualTeamPage";
import FriendlySessionsPage from "./pages/FriendlySessionsPage";
import FriendlySessionDetailPage from "./pages/FriendlySessionDetailPage";
import PlayerPerformancePage from "./pages/PlayerPerformancePage";
import PositionsPage from "./pages/PositionsPage";

const { Content } = Layout;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem("nav:collapsed") === "1"
  );
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => !!authStore.getToken()
  );

  useEffect(() => {
    localStorage.setItem("nav:collapsed", collapsed ? "1" : "0");
  }, [collapsed]);

  // Atualiza o estado de autenticação sempre que a rota mudar (login/logout)
  useEffect(() => {
    setIsAuthenticated(!!authStore.getToken());
  }, [location.pathname]);

  const toggleCollapsed = () => setCollapsed((c) => !c);

  return (
    <QueryClientProvider client={queryClient}>
      <Layout style={{ minHeight: "100vh" }}>
        {isAuthenticated && (
          <Nav collapsed={collapsed} onToggle={toggleCollapsed} />
        )}
        <Layout
          style={{
            marginLeft: isAuthenticated ? (collapsed ? 72 : 220) : 0,
            transition: "margin-left 0.2s",
            minHeight: "100vh",
          }}
        >
          <Content style={{ padding: 24 }}>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />

              {/* Rotas públicas */}
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<SignupTenant />} />
              <Route path="/verify" element={<VerifyEmailPage />} />

              {/* Rotas protegidas */}
              <Route
                path="/dashboard"
                element={
                  <RequireAuth>
                    <Dashboard />
                  </RequireAuth>
                }
              />
              <Route
                path="/performance"
                element={
                  <RequireAuth>
                    <PlayerPerformancePage />
                  </RequireAuth>
                }
              />
              <Route
                path="/skills"
                element={
                  <RequireAuth>
                    <Skills />
                  </RequireAuth>
                }
              />
              <Route
                path="/positions"
                element={
                  <RequireAuth>
                    <PositionsPage />
                  </RequireAuth>
                }
              />
              <Route
                path="/players"
                element={
                  <RequireAuth>
                    <Players />
                  </RequireAuth>
                }
              />
              <Route
                path="/generator"
                element={
                  <RequireAuth>
                    <TeamGenerator />
                  </RequireAuth>
                }
              />
              <Route
                path="/players/:playerId/ratings"
                element={
                  <RequireAuth>
                    <PlayerRatings />
                  </RequireAuth>
                }
              />
              <Route
                path="/friendly-sessions"
                element={
                  <RequireAuth>
                    <FriendlySessionsPage />
                  </RequireAuth>
                }
              />
              <Route
                path="/friendly-sessions/:sessionId"
                element={
                  <RequireAuth>
                    <FriendlySessionDetailPage />
                  </RequireAuth>
                }
              />
              <Route
                path="/championships"
                element={
                  <RequireAuth>
                    <ChampionshipsPage />
                  </RequireAuth>
                }
              />
              <Route
                path="/championships/:id"
                element={
                  <RequireAuth>
                    <ChampionshipDetailPage />
                  </RequireAuth>
                }
              />
              <Route
                path="/manual-teams"
                element={
                  <RequireAuth>
                    <ManualTeamPage />
                  </RequireAuth>
                }
              />

              {/* Rota coringa */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Content>
        </Layout>
      </Layout>
    </QueryClientProvider>
  );
}