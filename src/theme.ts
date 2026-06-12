import type { ThemeConfig } from "antd";

export const theme: ThemeConfig = {
  token: {
    colorPrimary: "#01ff69",
    colorInfo: "#2f9bff",
    colorWarning: "#ff9f1a",
    colorError: "#ff4d4f",

    colorBgBase: "#0b0f0c",
    colorBgContainer: "#161616",
    colorBorder: "rgba(43, 217, 107, 0.18)",
    colorText: "rgba(255,255,255,0.92)",
    colorTextSecondary: "rgba(255,255,255,0.72)",

    borderRadius: 14,
    controlHeight: 38,
    fontSize: 14,
  },
  components: {
    Layout: {
      bodyBg: "#0b0f0c",
      headerBg: "#161616",
      siderBg: "#1a1a1a",
    },
    Card: {
      headerBg: "transparent",
      colorBorderSecondary: "rgba(43, 217, 107, 0.18)",
    },
    Menu: {
      itemBg: "transparent",
      itemSelectedBg: "rgba(43,217,107,0.12)",
      itemSelectedColor: "#01ff69",
      itemColor: "rgba(255,255,255,0.78)",
    },
    Table: {
      headerBg: "#1a1a1a",
      headerColor: "rgba(255,255,255,0.92)",
      colorBorderSecondary: "rgba(43, 217, 107, 0.18)",
    },
    Input: {
      colorBgContainer: "#1a1a1a",
      colorBorder: "rgba(255,255,255,0.10)",
      colorTextPlaceholder: "rgba(255,255,255,0.45)",
    },
    Button: {
      borderRadius: 10,
    },
  },
};
