import { useMemo } from "react";
import { Layout, Menu, Tooltip, Drawer, FloatButton } from "antd";
import {
  TrophyOutlined,
  UserOutlined,
  StarOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  TeamOutlined,
  ScheduleOutlined,
  EditOutlined,
  BarChartOutlined,
  MenuOutlined,
  WhatsAppOutlined
} from "@ant-design/icons";
import { FaVolleyballBall } from "@react-icons/all-files/fa/FaVolleyballBall";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useMediaQuery } from "react-responsive";
import { authStore } from "../auth/store";
import { useState } from "react";

const { Sider } = Layout;

interface NavProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Nav({ collapsed, onToggle }: NavProps) {
  const nav = useNavigate();
  const loc = useLocation();
  const { slug } = useParams();
  const token = authStore.getToken();
  const isMobile = useMediaQuery({ maxWidth: 768 });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const auth = authStore.get();
  const features = auth.features || [];
  const groupName = auth.groupName || slug || "Team Generator";

  const logoSrc = "/logo_minimal_light.svg";

  const base = slug ? `/t/${slug}` : "";

  const menuItems = useMemo(() => {
    const items = [
      { key: `${base}/dashboard`, icon: <TrophyOutlined />, label: "Dashboard" },
      { key: `${base}/performance`, icon: <BarChartOutlined />, label: "Desempenho" },
      { key: `${base}/skills`, icon: <StarOutlined />, label: "Skills" },
      { key: `${base}/positions`, icon: <FaVolleyballBall />, label: "Posições" },
      { key: `${base}/players`, icon: <UserOutlined />, label: "Jogadores" },
      { key: `${base}/generator`, icon: <TeamOutlined />, label: "Gerar Times" },
    ];

    if (features.includes('campeonatos')) {
      items.push(
        { key: "/manual-teams", icon: <EditOutlined />, label: "Criar Campeonato" },
        { key: "/championships", icon: <ScheduleOutlined />, label: "Campeonatos" }
      );
    }

    items.push({ key: `${base}/logout`, icon: <LogoutOutlined />, label: "Sair" });

    return items;
  }, [token, base, features]);

  const selectedKey = useMemo(() => {
    return (
      menuItems
        .map((i) => i.key)
        .filter((k) => !k.endsWith("/logout"))
        .sort((a, b) => b.length - a.length)
        .find((k) => loc.pathname.startsWith(k)) ?? loc.pathname
    );
  }, [menuItems, loc.pathname]);

  const handleMenuClick = (key: string) => {
    if (key.endsWith("/logout")) {
      authStore.clear();
      nav(slug ? `/t/${slug}/login` : "/login");
      return;
    }
    nav(key);
    setMobileMenuOpen(false);
  };

  const renderMenu = (mode: "inline" | "vertical", inlineCollapsed: boolean) => (
    <Menu
      className="nav-menu"
      mode={mode}
      inlineCollapsed={inlineCollapsed}
      selectedKeys={[selectedKey]}
      items={menuItems}
      onClick={(e) => handleMenuClick(String(e.key))}
    />
  );

  // ─── DESKTOP: Sider fixa ───
  if (!isMobile) {
    return (
<Sider
  width={220}
  collapsedWidth={72}
  collapsed={collapsed}
  trigger={null}
  className="nav-sider"
  style={{
    position: "fixed",
    left: 0,
    top: 0,
    bottom: 0,
    height: "100vh",
    overflow: "hidden",
    zIndex: 10,
    display: "flex",
    flexDirection: "column",
  }}
>
  {/* BRAND */}
  <div className={`nav-brand ${collapsed ? "collapsed" : ""}`}>
    <img src={logoSrc} alt="Logo" className="nav-logo" />
    {!collapsed && (
      <div className="nav-brand-text">
        <div className="nav-title">R4NDO</div>
        <div className="nav-subtitle">{groupName.toUpperCase()}</div>
      </div>
    )}
  </div>

  {/* MENU - com padding inferior para não sobrepor o footer */}
  <Menu
    className="nav-menu"
    mode="inline"
    inlineCollapsed={collapsed}
    selectedKeys={[selectedKey]}
    items={menuItems}
    onClick={(e) => handleMenuClick(String(e.key))}
    style={{ flex: 1, overflow: "auto", paddingBottom: collapsed ? 5 : 10 }}
  />

    {/* Botão de recolher/expandir */}
    <Tooltip title={collapsed ? "Expandir menu" : "Recolher menu"} placement="right">
      <button
        type="button"
        className="action-btn-compact generate nav-toggle-btn"
        onClick={onToggle}
        aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
        style={{alignContent: 'center', justifyContent: 'center', margin: '8px auto'}}
      >
        {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
      </button>
    </Tooltip>
  {/* FOOTER FIXO NA BASE */}
  <div
    style={{
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      display: "flex",
      flexDirection: "column",
      gap: 8,
      padding: "12px 16px",
    }}
  >
    {/* WhatsApp */}
    <Tooltip title="Suporte WhatsApp" placement="right">
      <a
        href="https://wa.me/5598984733608?text=Olá! Preciso de ajuda com o R4NDO"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          padding: "8px 12px",
          borderRadius: 6,
          backgroundColor: "#01FF69",
          color: "#000",
          fontWeight: "bold",
          textDecoration: "none",
          fontSize: 14,
          textAlign: "center",
        }}
      >
        <WhatsAppOutlined style={{ fontSize: 18 }} />
        {!collapsed && <span>Suporte</span>}
      </a>
    </Tooltip>
  </div>
</Sider>
    );
  }

  // ─── MOBILE: FAB + Drawer ───
  return (
    <>
      <FloatButton
        icon={<MenuOutlined />}
        type="primary"
        style={{
          right: 16,
          bottom: 16,
          backgroundColor: '#01ff69',
          color: '#1a1a1a',
        }}
        onClick={() => setMobileMenuOpen(true)}
      />
      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img src={logoSrc} alt="Logo" style={{ width: 32, height: 32 }} />
            <span style={{ color: '#01ff69', fontWeight: 'bold' }}>{groupName.toUpperCase()}</span>
          </div>
        }
        placement="left"
        onClose={() => setMobileMenuOpen(false)}
        open={mobileMenuOpen}
        size="default"
        styles={{
          header: {
            backgroundColor: '#1a1a1a',
            borderBottom: '1px solid #333',
          },
          body: {
            backgroundColor: '#1a1a1a',
            padding: 0,
          },
        }}
      >
        {renderMenu("vertical", false)}
      </Drawer>
    </>
  );
}