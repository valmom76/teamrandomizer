import { useMemo } from "react";
import { Layout, Menu, Tooltip } from "antd";
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
} from "@ant-design/icons";
import { FaVolleyballBall } from "@react-icons/all-files/fa/FaVolleyballBall";

import { useLocation, useNavigate, useParams } from "react-router-dom";
import { authStore } from "../auth/store";

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

  const auth = authStore.get();
  const features = auth.features || [];
  const groupName = auth.groupName || slug || "Team Generator";
  
  const resolveLogoUrl = (logoPath?: string | null) => {
    if (!logoPath) {
      return "/logo_minimal_light.svg";
    }

    if (logoPath.startsWith("http://") || logoPath.startsWith("https://")) {
      return logoPath;
    }

    if (logoPath.startsWith("/api/")) {
      return logoPath;
    }

    if (logoPath.startsWith("/uploads/")) {
      return `/api${logoPath}`;
    }

    return logoPath;
  };

  const logoSrc = resolveLogoUrl(auth.logoUrl);

  const base = slug ? `/t/${slug}` : "";

  const items = useMemo(() => {
    const baseItems = [
      { key: `${base}/dashboard`, icon: <TrophyOutlined />, label: "Dashboard" },
      { key: `${base}/performance`, icon: <BarChartOutlined />, label: "Desempenho" },
      { key: `${base}/skills`, icon: <StarOutlined />, label: "Skills" },
      { key: `${base}/positions`, icon: <FaVolleyballBall />, label: "Posições" },
      { key: `${base}/players`, icon: <UserOutlined />, label: "Jogadores" },
      { key: `${base}/generator`, icon: <TeamOutlined />, label: "Gerar Times" },
    ];

    if (features.includes('campeonatos')) {
      baseItems.push(
        { key: "/manual-teams", icon: <EditOutlined />, label: "Criar Campeonato" },
        { key: "/championships", icon: <ScheduleOutlined />, label: "Campeonatos" }
      );
    }

    baseItems.push({ key: `${base}/logout`, icon: <LogoutOutlined />, label: "Sair" });

    return baseItems;
  }, [token, base, features]);

  const selectedKey = useMemo(() => {
    return (
      items
        .map((i) => i.key)
        .filter((k) => !k.endsWith("/logout"))
        .sort((a, b) => b.length - a.length)
        .find((k) => loc.pathname.startsWith(k)) ?? loc.pathname
    );
  }, [items, loc.pathname]);

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
        overflow: "auto",
        zIndex: 10,
      }}
    >
      {/* BRAND */}
      <div className={`nav-brand ${collapsed ? "collapsed" : ""}`}>
        {/* Logo customizável por tenant */}
        <img src={logoSrc} alt="Logo" className="nav-logo" />

        {!collapsed && (
          <div className="nav-brand-text">
            <div className="nav-title">R4NDO</div>
            <div className="nav-subtitle">
              {groupName.toUpperCase()}
            </div>
          </div>
        )}
      </div>

      {/* MENU */}
      <Menu
        className="nav-menu"
        mode="inline"
        inlineCollapsed={collapsed}
        selectedKeys={[selectedKey]}
        items={items}
        onClick={(e) => {
          if (String(e.key).endsWith("/logout")) {
            authStore.clear();
            nav(slug ? `/t/${slug}/login` : "/login");
            return;
          }
          nav(String(e.key));
        }}
      />

      <div className="nav-footer">
        <Tooltip title={collapsed ? "Expandir menu" : "Recolher menu"} placement="right">
          <button
            type="button"
            className="action-btn-compact generate nav-toggle-btn"
            onClick={onToggle}
            aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
          >
            {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          </button>
        </Tooltip>
      </div>
    </Sider>
  );
}