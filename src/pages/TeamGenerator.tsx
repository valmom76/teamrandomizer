import { useCallback, useMemo, useState } from "react";
import { Tabs, Card, Space, Badge, Typography } from "antd";
import type { TabsProps } from "antd";
import {
  UploadOutlined,
  DatabaseOutlined,
  FundOutlined,
  TeamOutlined,
  CopyOutlined,
  ReloadOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";

import FileUpload from "../components/FileUpload";
import PlayerColumn from "../components/PlayerColumn";
import DbTeamGenerator from "../features/db/DbTeamGenerator";
import { PotSelection } from "../components/PotSelection";

import AppButton from "../components/AppButton";
import "../styles/team-generator.css";

const { Text, Title } = Typography;

export type PlayerColumns = {
  coluna1: string[];
  coluna2: string[];
  coluna3: string[];
  coluna4: string[];
};

interface TeamTxt {
  nome: string;
  jogadores: string[];
}

type TabKey = "upload" | "database" | "potes";

const DEFAULT_MAX_TEAMS = 8;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function TeamGenerator() {
  const [activeTab, setActiveTab] = useState<TabKey>("database");

  // TXT states
  const [playersTxt, setPlayersTxt] = useState<PlayerColumns>({
    coluna1: [],
    coluna2: [],
    coluna3: [],
    coluna4: [],
  });
  const [teamsTxt, setTeamsTxt] = useState<TeamTxt[]>([]);
  const [fileName, setFileName] = useState("");
  const [key, setKey] = useState(0);
  const [maxTeamsTxt, setMaxTeamsTxt] = useState<number>(DEFAULT_MAX_TEAMS);

  // Parse players
  const parsePlayers = useCallback((text: string): PlayerColumns => {
    const lines = text.split("\n");
    let currentColumn: keyof PlayerColumns | null = null;
    const parsedPlayers: PlayerColumns = {
      coluna1: [],
      coluna2: [],
      coluna3: [],
      coluna4: [],
    };

    lines.forEach((line) => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return;
      const lowerLine = trimmedLine.toLowerCase();

      if (
        lowerLine.includes("pote 1") ||
        lowerLine.includes("avançado") ||
        lowerLine.includes("avancado")
      ) {
        currentColumn = "coluna1";
        return;
      }
      if (
        lowerLine.includes("pote 2") ||
        lowerLine.includes("intermediário superior") ||
        lowerLine.includes("intermediario superior")
      ) {
        currentColumn = "coluna2";
        return;
      }
      if (
        lowerLine.includes("pote 3") ||
        lowerLine.includes("intermediário") ||
        lowerLine.includes("intermediario")
      ) {
        currentColumn = "coluna3";
        return;
      }
      if (lowerLine.includes("pote 4") || lowerLine.includes("iniciante")) {
        currentColumn = "coluna4";
        return;
      }

      if (lowerLine.includes("pote")) {
        const match = lowerLine.match(/pote\s*(\d)/);
        if (match) {
          const colNum = parseInt(match[1], 10);
          if (colNum >= 1 && colNum <= 4)
            currentColumn = `coluna${colNum}` as keyof PlayerColumns;
        }
        return;
      }

      if (!currentColumn) return;

      const cleanName = trimmedLine
        .replace(/^\d+[\.\-\)]\s*/, "")
        .replace(/^-\s*/, "")
        .replace(/^\*\s*/, "")
        .trim();

      if (cleanName.length > 1 && /[a-zA-ZÀ-ÿ]/.test(cleanName)) {
        parsedPlayers[currentColumn].push(cleanName);
      }
    });

    return parsedPlayers;
  }, []);

  const handleFileUpload = useCallback(
    (file: File, content: string) => {
      setFileName(file.name);
      const parsed = parsePlayers(content);
      const columns = Object.keys(parsed) as Array<keyof PlayerColumns>;
      const issues: string[] = [];
      columns.forEach((col) => {
        const count = parsed[col].length;
        if (count < 4) issues.push(`${col}: ${count} jogadores (mínimo 4)`);
      });

      if (issues.length > 0) {
        alert(
          `Atenção: no arquivo ${file.name}\n\n${issues.join(
            "\n"
          )}\n\nÉ necessário pelo menos 4 jogadores por coluna.`
        );
        return;
      }

      const counts = columns.map((col) => parsed[col].length);
      const minCount = Math.min(...counts);
      const maxCount = Math.max(...counts);

      if (minCount !== maxCount) {
        const warning =
          `As colunas têm quantidades diferentes de jogadores:\n\n` +
          `• Pote 1: ${parsed.coluna1.length}\n` +
          `• Pote 2: ${parsed.coluna2.length}\n` +
          `• Pote 3: ${parsed.coluna3.length}\n` +
          `• Pote 4: ${parsed.coluna4.length}\n\n` +
          `Serão gerados até ${Math.min(
            DEFAULT_MAX_TEAMS,
            minCount
          )} times (limitado pela menor coluna).`;

        if (!window.confirm(warning + "\n\nDeseja continuar?")) return;
      }

      setPlayersTxt(parsed);
      setTeamsTxt([]);
      setActiveTab("upload");
      const newMaxPossible = Math.min(DEFAULT_MAX_TEAMS, minCount);
      setMaxTeamsTxt((prev) => clamp(prev, 1, newMaxPossible));
    },
    [parsePlayers]
  );

  const shuffleArray = useCallback((array: string[]) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }, []);

  const generateTeamsTxt = useCallback(() => {
    const { coluna1, coluna2, coluna3, coluna4 } = playersTxt;
    const minPlayers = Math.min(
      coluna1.length,
      coluna2.length,
      coluna3.length,
      coluna4.length
    );

    if (minPlayers < 4) {
      alert(
        "Não há jogadores suficientes em todas as colunas. Mínimo necessário: 4 jogadores por coluna."
      );
      return;
    }

    const maxPossible = Math.min(DEFAULT_MAX_TEAMS, minPlayers);
    const effectiveTeams = clamp(maxTeamsTxt, 1, maxPossible);

    const shuffledCol1 = shuffleArray(coluna1);
    const shuffledCol2 = shuffleArray(coluna2);
    const shuffledCol3 = shuffleArray(coluna3);
    const shuffledCol4 = shuffleArray(coluna4);

    const newTeams: TeamTxt[] = [];
    for (let i = 0; i < effectiveTeams; i++) {
      newTeams.push({
        nome: `Time ${i + 1}`,
        jogadores: [
          shuffledCol1[i],
          shuffledCol2[i],
          shuffledCol3[i],
          shuffledCol4[i],
        ],
      });
    }

    setMaxTeamsTxt(effectiveTeams);
    setTeamsTxt(newTeams);
  }, [playersTxt, maxTeamsTxt, shuffleArray]);

  const copyTeamsTxtToClipboard = useCallback(() => {
    const text = teamsTxt
      .map(
        (team) =>
          `${team.nome}:\n${team.jogadores
            .map((j, i) => `  ${i + 1}. ${j}`)
            .join("\n")}`
      )
      .join("\n\n");

    navigator.clipboard
      .writeText(text)
      .then(() => alert("Times copiados para a área de transferência!"))
      .catch(() => alert("Erro ao copiar. Tente novamente."));
  }, [teamsTxt]);

  const resetAllTxt = useCallback(() => {
    setPlayersTxt({
      coluna1: [],
      coluna2: [],
      coluna3: [],
      coluna4: [],
    });
    setTeamsTxt([]);
    setFileName("");
    setMaxTeamsTxt(DEFAULT_MAX_TEAMS);
    setKey((prev) => prev + 1);
    setActiveTab("upload");
  }, []);

  const hasPlayersTxt = useMemo(
    () => Object.values(playersTxt).some((col) => col.length > 0),
    [playersTxt]
  );
  const hasTeamsTxt = teamsTxt.length > 0;
  const canGenerateTxt = useMemo(
    () => Object.values(playersTxt).every((col) => col.length >= 4),
    [playersTxt]
  );
  const totalPlayersTxt = useMemo(
    () =>
      Object.values(playersTxt).reduce((sum, col) => sum + col.length, 0),
    [playersTxt]
  );

  const minPlayersTxt = hasPlayersTxt
    ? Math.min(...Object.values(playersTxt).map((col) => col.length))
    : 0;
  const maxPossibleTeamsTxt = hasPlayersTxt
    ? Math.min(DEFAULT_MAX_TEAMS, minPlayersTxt)
    : 0;

  const darkCardStyle = {
    backgroundColor: "#1a1a1a",
    border: "1px solid #333",
    borderRadius: 8,
    marginBottom: 16,
  };

  const cardBodyStyle = { padding: 'clamp(12px, 3vw, 24px)' };

  const tabsItems: TabsProps["items"] = [
    {
      key: "database",
      label: (
        <span style={{ fontSize: 'clamp(14px, 2.5vw, 20px)', fontWeight: "bold" }}>
          <DatabaseOutlined /> Sorteio
        </span>
      ),
    },
    {
      key: "potes",
      label: (
        <span style={{ fontSize: 'clamp(14px, 2.5vw, 20px)', fontWeight: "bold" }}>
          <FundOutlined /> Potes
        </span>
      ),
    },
    {
      key: "upload",
      label: (
        <span style={{ fontSize: 'clamp(14px, 2.5vw, 20px)', fontWeight: "bold" }}>
          <UploadOutlined /> Upload TXT
        </span>
      ),
    },
  ];

  const onTabChange = useCallback((k: string) => {
    setActiveTab(k as TabKey);
  }, []);

  return (
    <div className="team-generator-compact" style={{ padding: 'clamp(8px, 2vw, 16px)' }}>
      <div className="main-tabs">
        <Tabs
          activeKey={activeTab}
          onChange={onTabChange}
          items={tabsItems}
          size="large"
          tabBarStyle={{ color: "#01ff69", fontWeight: "bold" }}
        />
      </div>

      {activeTab === "upload" && (
        <div className="main-content" style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
          <div
            className="controls-column ui-scroll"
            style={{ overflow: "auto", flex: '1 1 350px', minWidth: 280 }}
          >
            <Card style={darkCardStyle} styles={{ body: cardBodyStyle }}>
              <FileUpload key={key} onFileUpload={handleFileUpload} />
              {fileName && (
                <div style={{ marginTop: 12 }}>
                  <Text style={{ color: "#01ff69", fontSize: 'clamp(14px, 2vw, 16px)' }}>
                    📁 {fileName}
                  </Text>
                </div>
              )}
            </Card>

            {hasPlayersTxt && (
              <>
                <Card
                  style={darkCardStyle}
                  title={
                    <span style={{ color: "#01ff69", fontSize: 'clamp(16px, 2.5vw, 20px)', fontWeight: "bold" }}>
                      ⚙️ Configuração
                    </span>
                  }
                  styles={{ header: { borderBottom: "1px solid #333" }, body: cardBodyStyle }}
                >
                  <div style={{ marginBottom: 16 }}>
                    <Text style={{ color: "#aaa", fontSize: 'clamp(14px, 2vw, 16px)' }}>
                      Times a gerar:
                    </Text>
                    <div style={{ display: "flex", gap: 12, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      <input
                        type="number"
                        min={1}
                        max={Math.max(1, maxPossibleTeamsTxt)}
                        value={clamp(
                          maxTeamsTxt,
                          1,
                          Math.max(1, maxPossibleTeamsTxt)
                        )}
                        onChange={(e) => {
                          const parsed = parseInt(e.target.value, 10);
                          const safe = Number.isFinite(parsed) ? parsed : 1;
                          setMaxTeamsTxt(
                            clamp(
                              safe,
                              1,
                              Math.max(1, maxPossibleTeamsTxt || 1)
                            )
                          );
                        }}
                        style={{
                          width: 80,
                          fontSize: 'clamp(18px, 3vw, 24px)',
                          textAlign: "center",
                          backgroundColor: "#262626",
                          color: "#fff",
                          border: "1px solid #01ff69",
                          borderRadius: 6,
                        }}
                      />
                      <Space size={[4, 4]} wrap>
                        {[4, 6, 8].map((n) => {
                          const disabled =
                            maxPossibleTeamsTxt > 0
                              ? n > maxPossibleTeamsTxt
                              : true;
                          return (
                            <AppButton
                              key={n}
                              tone={maxTeamsTxt === n ? "generate" : "save"}
                              onClick={() =>
                                setMaxTeamsTxt(
                                  clamp(
                                    n,
                                    1,
                                    Math.max(1, maxPossibleTeamsTxt)
                                  )
                                )
                              }
                              disabled={disabled}
                              style={{ fontSize: 13 }}
                            >
                              {n}
                            </AppButton>
                          );
                        })}
                      </Space>
                    </div>
                    <Badge
                      count={`Máx: ${maxPossibleTeamsTxt}`}
                      style={{
                        backgroundColor: "#01ff69",
                        color: "#1a1a1a",
                        fontWeight: "bold",
                        fontSize: 14,
                        marginTop: 8,
                      }}
                    />
                  </div>
                  <Text style={{ color: "#aaa", fontSize: 'clamp(12px, 1.8vw, 14px)' }}>
                    {totalPlayersTxt} jogadores carregados
                  </Text>
                </Card>

                <Card
                  style={darkCardStyle}
                  title={
                    <span style={{ color: "#01ff69", fontSize: 'clamp(16px, 2.5vw, 20px)', fontWeight: "bold" }}>
                      <TeamOutlined /> Jogadores Carregados
                    </span>
                  }
                  styles={{ header: { borderBottom: "1px solid #333" }, body: cardBodyStyle }}
                >
                  <div className="columns-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                    <PlayerColumn
                      players={playersTxt.coluna1}
                      pot={1}
                      compact
                      maxTeams={maxTeamsTxt}
                    />
                    <PlayerColumn
                      players={playersTxt.coluna2}
                      pot={2}
                      compact
                      maxTeams={maxTeamsTxt}
                    />
                    <PlayerColumn
                      players={playersTxt.coluna3}
                      pot={3}
                      compact
                      maxTeams={maxTeamsTxt}
                    />
                    <PlayerColumn
                      players={playersTxt.coluna4}
                      pot={4}
                      compact
                      maxTeams={maxTeamsTxt}
                    />
                  </div>
                </Card>
              </>
            )}
          </div>

          <div className="results-column ui-scroll" style={{ overflow: "auto", flex: '1 1 400px', minWidth: 300 }}>
            <Card
              style={darkCardStyle}
              title={
                <span style={{ color: "#01ff69", fontSize: 'clamp(16px, 2.5vw, 20px)', fontWeight: "bold" }}>
                  <ThunderboltOutlined /> Times Gerados (TXT)
                </span>
              }
              styles={{ header: { borderBottom: "1px solid #333" }, body: cardBodyStyle }}
            >
              {hasTeamsTxt ? (
                <>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 20,
                      flexWrap: 'wrap',
                      gap: 8,
                    }}
                  >
                    <Space size={[4, 4]} wrap>
                      <AppButton
                        tone="generate"
                        onClick={generateTeamsTxt}
                        disabled={!canGenerateTxt}
                        icon={<ReloadOutlined />}
                        style={{ fontSize: 13 }}
                      >
                        Reembaralhar
                      </AppButton>
                      <AppButton
                        tone="copy"
                        onClick={copyTeamsTxtToClipboard}
                        icon={<CopyOutlined />}
                        style={{ fontSize: 13 }}
                      >
                        Copiar
                      </AppButton>
                      {hasPlayersTxt && (
                        <AppButton
                          tone="reset"
                          onClick={resetAllTxt}
                          icon={<ReloadOutlined />}
                          style={{ fontSize: 13 }}
                        >
                          Restaurar
                        </AppButton>
                      )}
                    </Space>
                    <Badge
                      count={`${teamsTxt.length} times`}
                      style={{
                        backgroundColor: "#01ff69",
                        color: "#1a1a1a",
                        fontWeight: "bold",
                        fontSize: 16,
                      }}
                    />
                  </div>

                  <div className="tg-teams-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 12 }}>
                    {teamsTxt.map((team, index) => (
                      <div key={index} className="tg-team-card">
                        <div className="tg-team-name" style={{ fontSize: 'clamp(16px, 2vw, 18px)' }}>{team.nome}</div>
                        <div className="tg-team-players">
                          {team.jogadores.map((jogador, idx) => (
                            <div key={idx} className="tg-team-player">
                              <span
                                className="tg-player-name"
                                title={jogador}
                                style={{ fontSize: 'clamp(13px, 1.5vw, 14px)' }}
                              >
                                {jogador}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div
                  style={{
                    textAlign: "center",
                    padding: 'clamp(20px, 5vw, 40px)',
                    color: "#aaa",
                  }}
                >
                  <div style={{ fontSize: 'clamp(32px, 8vw, 48px)', marginBottom: 16 }}>🏐</div>
                  <Title
                    level={3}
                    style={{ color: "#fff", marginBottom: 8, fontSize: 'clamp(18px, 3vw, 24px)' }}
                  >
                    Nenhum time gerado
                  </Title>
                  <Text style={{ color: "#aaa", fontSize: 'clamp(14px, 2vw, 16px)' }}>
                    {canGenerateTxt
                      ? `Clique em "Gerar" para criar ${clamp(
                          maxTeamsTxt,
                          1,
                          Math.max(1, maxPossibleTeamsTxt || 1)
                        )} times balanceados`
                      : "Faça upload de um arquivo com jogadores"}
                  </Text>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {activeTab === "database" && <DbTeamGenerator />}
      {activeTab === "potes" && <PotSelection />}
    </div>
  );
};