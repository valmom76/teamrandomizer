import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { DragEvent } from "react";
import {
  Checkbox,
  Input,
  InputNumber,
  Spin,
  Typography,
  message,
  Tag,
  Button,
  Modal,
  Select,
} from "antd";
import type { CheckboxChangeEvent } from "antd/es/checkbox";
import {
  HistoryOutlined,
  PlayCircleOutlined,
  SwapOutlined,  
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

import { http } from "../../api/http";
import "../../styles/team-generator.css";
import { CourtSetupModal } from "../../components/game/CourtSetupModal";

const { Text } = Typography;

type UUID = string;

type Player = {
  id: UUID;
  name: string;
  sex: "M" | "F";
  active: boolean;
};

type Skill = {
  id: UUID;
  name: string;
  active: boolean;
};

type GenerateDbRequest = {
  teamCount: number;
  playersPerTeam: number;
  playerIds: UUID[];
  selectedSkills: Array<{ skillId: UUID; weight: number }>;
  sexBalance?: { enabled: boolean; maxMaleDiff: number };
  sexMultiplier?: Record<"M" | "F", number>;
  requiredPositions?: UUID[];
};

type RawTeamPlayer = {
  id?: UUID;
  playerId?: UUID;
  player_id?: UUID;
  athleteId?: UUID;
  athlete_id?: UUID;
  name?: string;
  sex?: "M" | "F";
  score?: number;
  player?: {
    id?: UUID;
    name?: string;
    sex?: "M" | "F";
  };
};

type TeamPlayer = {
  playerId: UUID;
  name: string;
  sex: "M" | "F";
  score: number;
};

type RawTeam = {
  teamIndex: number;
  sumScore: number;
  players: RawTeamPlayer[];
};

type Team = {
  teamIndex: number;
  sumScore: number;
  players: TeamPlayer[];
};

type GenerateDbApiResponse = {
  sessionId: UUID;
  teams: RawTeam[];
};

type GenerateDbResponse = {
  sessionId: UUID;
  teams: Team[];
};

type StepKey = "players" | "skills" | "result";

type DragPlayerData = {
  playerId: string;
  fromTeamIndex: number;
};

const DEFAULT_TEAM_COUNT = 8;
const DEFAULT_PLAYERS_PER_TEAM = 4;

export default function DbTeamGenerator() {
  // ---------- estados ----------
  const [step, setStep] = useState<StepKey>("players");

  const [playersLoading, setPlayersLoading] = useState(false);
  const [skillsLoading, setSkillsLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [recovering, setRecovering] = useState(false);

  const [players, setPlayers] = useState<Player[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);

  const [teamCount, setTeamCount] = useState(DEFAULT_TEAM_COUNT);
  const [playersPerTeam, setPlayersPerTeam] = useState(DEFAULT_PLAYERS_PER_TEAM);

  const [playerQuery, setPlayerQuery] = useState("");
  const [skillQuery, setSkillQuery] = useState("");

  const [selectedPlayerIds, setSelectedPlayerIds] = useState<UUID[]>([]);
  const [selectedSkillMap, setSelectedSkillMap] = useState<Record<UUID, number>>({});

  const [sexBalanceEnabled, setSexBalanceEnabled] = useState(true);
  const [maxMaleDiff, setMaxMaleDiff] = useState(1);
  const [multM, setMultM] = useState(1.0);
  const [multF, setMultF] = useState(0.92);

  const [balancePositions, setBalancePositions] = useState(false);
  const [requiredPositions, setRequiredPositions] = useState<UUID[]>([]);
  const [availablePositions, setAvailablePositions] = useState<{ id: UUID; name: string }[]>([]);

  const [result, setResult] = useState<GenerateDbResponse | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);

  const [courtModalOpen, setCourtModalOpen] = useState(false);
  const [dragOverTeamIndex, setDragOverTeamIndex] = useState<number | null>(null);
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);

  const dragDataRef = useRef<DragPlayerData | null>(null);
  const navigate = useNavigate();

  const needed = teamCount * playersPerTeam;

  // ---------- dados derivados ----------
  const activePlayers = useMemo(() => players.filter((p) => p.active), [players]);
  const activeSkills = useMemo(() => skills.filter((s) => s.active), [skills]);

  const filteredPlayers = useMemo(() => {
    const q = playerQuery.trim().toLowerCase();
    if (!q) return activePlayers;
    return activePlayers.filter((p) => p.name.toLowerCase().includes(q));
  }, [activePlayers, playerQuery]);

  const filteredSkills = useMemo(() => {
    const q = skillQuery.trim().toLowerCase();
    if (!q) return activeSkills;
    return activeSkills.filter((s) => s.name.toLowerCase().includes(q));
  }, [activeSkills, skillQuery]);

  const selectedSkills = useMemo(
    () => Object.entries(selectedSkillMap).map(([skillId, weight]) => ({ skillId, weight })),
    [selectedSkillMap]
  );

  const canGoNext = selectedPlayerIds.length >= needed;
  const canGenerate = canGoNext && selectedSkills.length > 0;

  // ---------- helpers de normalização ----------
  const findPlayerByName = useCallback(
    (name?: string) => {
      if (!name) return undefined;
      const normalized = name.trim().toLowerCase();
      return players.find((p) => p.name.trim().toLowerCase() === normalized);
    },
    [players]
  );

  const getRawTeamPlayerId = useCallback((player: RawTeamPlayer) => {
    return (
      player.playerId ??
      player.id ??
      player.player_id ??
      player.athleteId ??
      player.athlete_id ??
      player.player?.id ??
      ""
    );
  }, []);

  const normalizeTeamPlayer = useCallback(
    (rawPlayer: RawTeamPlayer): TeamPlayer => {
      const rawName = rawPlayer.name ?? rawPlayer.player?.name ?? "";
      const fallback = findPlayerByName(rawName);
      const playerId = getRawTeamPlayerId(rawPlayer) || fallback?.id || "";
      const name = rawPlayer.name ?? rawPlayer.player?.name ?? fallback?.name ?? "Jogador sem nome";
      const sex = rawPlayer.sex ?? rawPlayer.player?.sex ?? fallback?.sex ?? "M";
      const score = Number(rawPlayer.score ?? 0);
      return { playerId, name, sex, score };
    },
    [findPlayerByName, getRawTeamPlayerId]
  );

  const recalculateTeamScore = useCallback(
    (players: TeamPlayer[]) => players.reduce((sum, p) => sum + p.score, 0),
    []
  );

  const normalizeTeams = useCallback(
    (rawTeams: RawTeam[]): Team[] =>
      rawTeams.map((team) => {
        const players = team.players.map(normalizeTeamPlayer);
        return { teamIndex: team.teamIndex, players, sumScore: recalculateTeamScore(players) };
      }),
    [normalizeTeamPlayer, recalculateTeamScore]
  );

  const normalizeResponse = useCallback(
    (data: GenerateDbApiResponse): GenerateDbResponse => ({
      sessionId: data.sessionId,
      teams: normalizeTeams(data.teams ?? []),
    }),
    [normalizeTeams]
  );

  // ---------- carregamento de dados ----------
  const loadPlayers = useCallback(async () => {
    setPlayersLoading(true);
    try {
      const { data } = await http.get<Player[]>("/players");
      setPlayers(data);
    } catch (e) {
      console.error(e);
      message.error("Erro ao carregar jogadores");
    } finally {
      setPlayersLoading(false);
    }
  }, []);

  const loadSkills = useCallback(async () => {
    setSkillsLoading(true);
    try {
      const { data } = await http.get<Skill[]>("/skills");
      setSkills(data);
    } catch (e) {
      console.error(e);
      message.error("Erro ao carregar skills");
    } finally {
      setSkillsLoading(false);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([loadPlayers(), loadSkills()]);
  }, [loadPlayers, loadSkills]);

  useEffect(() => {
    http.get('/positions')
      .then(res => setAvailablePositions(res.data))
      .catch(() => message.error("Erro ao carregar posições"));
  }, []);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  useEffect(() => {
    if (result?.teams) setTeams(result.teams);
  }, [result]);

  // ---------- handlers de seleção ----------
  const togglePlayer = useCallback(
    (playerId: UUID, checked: boolean) => {
      setSelectedPlayerIds((prev) => {
        if (checked) {
          // Se já atingiu o limite, não permite adicionar mais
          if (prev.length >= needed) {
            message.warning(`Você já selecionou ${needed} jogadores.`);
            return prev;
          }
          return prev.includes(playerId) ? prev : [...prev, playerId];
        }
        return prev.filter((id) => id !== playerId);
      });
    },
    [needed]
  );

  const toggleSkill = useCallback((skillId: UUID, checked: boolean) => {
    setSelectedSkillMap((prev) => {
      const copy = { ...prev };
      if (checked) copy[skillId] = copy[skillId] ?? 1;
      else delete copy[skillId];
      return copy;
    });
  }, []);

  const setSkillWeight = useCallback(
    (skillId: UUID, weight: number) => setSelectedSkillMap((prev) => ({ ...prev, [skillId]: weight })),
    []
  );

  // ---------- navegação entre steps ----------
  const goNext = useCallback(() => {
    if (!canGoNext) {
      message.warning(`Selecione pelo menos ${needed} jogadores.`);
      return;
    }
    setStep("skills");
  }, [canGoNext, needed]);

  const goBackToPlayers = useCallback(() => setStep("players"), []);

  // ---------- geração de times ----------
  const generate = useCallback(async () => {
    if (!canGenerate) {
      message.warning("Selecione jogadores suficientes e pelo menos 1 skill.");
      return;
    }
    const payload: GenerateDbRequest = {
      teamCount,
      playersPerTeam,
      playerIds: selectedPlayerIds.slice(0, needed),
      selectedSkills,
      sexBalance: { enabled: sexBalanceEnabled, maxMaleDiff },
      sexMultiplier: { M: multM, F: multF },
      requiredPositions: balancePositions ? requiredPositions : [],
    };
    setGenerating(true);
    setResult(null);
    setTeams([]);
    try {
      const { data } = await http.post<GenerateDbApiResponse>("/teams/generate/db", payload);
      const normalized = normalizeResponse(data);
      setResult(normalized);
      setTeams(normalized.teams);
      setStep("result");
      message.success("Times gerados com sucesso!");
    } catch (e: any) {
      console.error(e);
      message.error(e?.response?.data?.message ?? "Erro ao gerar times");
    } finally {
      setGenerating(false);
    }
  }, [
    canGenerate, teamCount, playersPerTeam, selectedPlayerIds, needed,
    selectedSkills, sexBalanceEnabled, maxMaleDiff, multM, multF,
    balancePositions, requiredPositions, normalizeResponse,
  ]);

  const handleRecoverLatest = useCallback(async () => {
    setRecovering(true);
    try {
      const { data } = await http.get<GenerateDbApiResponse>("/teams/latest-session");
      const normalized = normalizeResponse(data);
      setResult(normalized);
      setTeams(normalized.teams);
      setStep("result");
      message.success("Última geração recuperada!");
    } catch (e: any) {
      console.error(e);
      message.error(e?.response?.data?.message ?? "Nenhuma sessão anterior encontrada.");
    } finally {
      setRecovering(false);
    }
  }, [normalizeResponse]);

  const resetAll = useCallback(() => {
    setStep("players");
    setSelectedPlayerIds([]);
    setSelectedSkillMap({});
    setResult(null);
    setTeams([]);
    setPlayerQuery("");
    setSkillQuery("");
    setTeamCount(DEFAULT_TEAM_COUNT);
    setPlayersPerTeam(DEFAULT_PLAYERS_PER_TEAM);
    setDragOverTeamIndex(null);
    setBalancePositions(false);
    setRequiredPositions([]);
    dragDataRef.current = null;
  }, []);

  // ==================== DRAG & DROP ====================
  const prepareDragPlayer = useCallback((playerId: string, fromTeamIndex: number) => {
    if (!playerId) return;
    dragDataRef.current = { playerId, fromTeamIndex };
  }, []);

  const movePlayerLocally = useCallback(
    (playerId: string, fromTeamIndex: number, toTeamIndex: number) => {
      const previous = teams.map((t) => ({ ...t, players: [...t.players] }));
      const newTeams = teams.map((t) => ({ ...t, players: [...t.players] }));
      const fromTeam = newTeams.find((t) => t.teamIndex === fromTeamIndex);
      const toTeam = newTeams.find((t) => t.teamIndex === toTeamIndex);
      if (!fromTeam || !toTeam) return { didMove: false, previousTeams: previous };
      const idx = fromTeam.players.findIndex((p) => p.playerId === playerId);
      if (idx === -1) return { didMove: false, previousTeams: previous };
      const [moved] = fromTeam.players.splice(idx, 1);
      toTeam.players.push(moved);
      fromTeam.sumScore = recalculateTeamScore(fromTeam.players);
      toTeam.sumScore = recalculateTeamScore(toTeam.players);
      setTeams(newTeams);
      return { didMove: true, previousTeams: previous };
    },
    [teams, recalculateTeamScore]
  );

  const handleDropPlayer = useCallback(
    async (playerId: string, fromTeamIndex: number, toTeamIndex: number) => {
      if (!playerId || fromTeamIndex === toTeamIndex) return;
      if (!result?.sessionId) return;
      const { previousTeams, didMove } = movePlayerLocally(playerId, fromTeamIndex, toTeamIndex);
      if (!didMove) return;
      try {
        await http.put(`/teams/session/${result.sessionId}/move-player`, {
          playerId, fromTeamIndex, toTeamIndex,
        });
      } catch (err: any) {
        message.error(err?.response?.data?.message ?? "Erro ao mover jogador. Revertendo...");
        setTeams(previousTeams);
      }
    },
    [result?.sessionId, movePlayerLocally]
  );

  const onDragStart = useCallback(
    (e: DragEvent<HTMLDivElement>, playerId: string, fromTeamIndex: number) => {
      if (!playerId) { e.preventDefault(); return; }
      const payload: DragPlayerData = { playerId, fromTeamIndex };
      dragDataRef.current = payload;
      e.dataTransfer.effectAllowed = "move";
      try {
        e.dataTransfer.setData("text/plain", JSON.stringify(payload));
      } catch (err) {
        console.warn("dataTransfer falhou", err);
      }
      e.currentTarget.classList.add("is-dragging");
    },
    []
  );

  const onDragEnd = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.currentTarget.classList.remove("is-dragging");
    setDragOverTeamIndex(null);
    setTimeout(() => { dragDataRef.current = null; }, 100);
  }, []);

  const onDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const onDragEnter = useCallback((e: DragEvent<HTMLDivElement>, teamIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverTeamIndex(teamIndex);
  }, []);

  const onDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    const related = e.relatedTarget as Node | null;
    if (related && e.currentTarget.contains(related)) return;
    setDragOverTeamIndex(null);
  }, []);

  const onDropOnTeam = useCallback(
    (e: DragEvent<HTMLDivElement>, toTeamIndex: number) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOverTeamIndex(null);
      let data: Partial<DragPlayerData> | null = null;
      try {
        const raw = e.dataTransfer.getData("text/plain");
        if (raw) data = JSON.parse(raw);
      } catch (err) {
        console.warn("Erro ao ler dataTransfer", err);
      }
      if (!data?.playerId || typeof data.fromTeamIndex !== "number") {
        data = dragDataRef.current;
      }
      if (!data?.playerId || typeof data.fromTeamIndex !== "number") return;
      handleDropPlayer(data.playerId, data.fromTeamIndex, toTeamIndex);
    },
    [handleDropPlayer]
  );

  // ---------- sessão com quadras ----------
  const handleStartSession = useCallback(
    async (courts: { name: string; teamIndices: number[] }[]) => {
      if (!result?.sessionId) return;
      try {
        await http.post("/game-sessions/start-with-courts", {
          generationSessionId: result.sessionId,
          courts,
        });
        message.success("Sessão iniciada com sucesso!");
        setCourtModalOpen(false);
        navigate(`/friendly-sessions/${result.sessionId}`);
      } catch (err: any) {
        console.error(err);
        message.error(err?.response?.data?.message ?? "Erro ao iniciar sessão");
      }
    },
    [result?.sessionId, navigate]
  );

  // ---------- renderização dos times (reutilizada) ----------
  const renderTeamsGrid = (compact: boolean) => (
    <div
      className="tg-teams-grid ui-scroll"
      style={{
        gridTemplateColumns: compact
          ? "repeat(auto-fill, minmax(240px, 1fr))"
          : "repeat(auto-fill, minmax(280px, 1fr))",
        gap: compact ? 12 : 20,
      }}
    >
      {teams.map((team) => {
        const isDragOver = dragOverTeamIndex === team.teamIndex;
        return (
          <div
            key={team.teamIndex}
            className={`tg-team-card ${isDragOver ? "is-drag-over" : ""}`}
            onDragOver={onDragOver}
            onDragEnter={(e) => onDragEnter(e, team.teamIndex)}
            onDragLeave={onDragLeave}
            onDrop={(e) => onDropOnTeam(e, team.teamIndex)}
          >
            <div className="tg-team-name">
              Time {team.teamIndex}{" "}
              <span style={{ fontSize: 12, color: "var(--text-2)", fontWeight: 900 }}>
                • {team.sumScore.toFixed(1)}
              </span>
            </div>
            <div className="tg-team-players">
              {team.players.map((p, idx) => {
                const canDrag = Boolean(p.playerId);
                return (
                  <div
                    key={p.playerId || `${team.teamIndex}-${p.name}-${idx}`}
                    className="tg-team-player"
                    draggable={canDrag}
                    onPointerDown={() => canDrag && prepareDragPlayer(p.playerId, team.teamIndex)}
                    onDragStart={(e) => onDragStart(e, p.playerId, team.teamIndex)}
                    onDragEnd={onDragEnd}
                    style={{
                      cursor: canDrag ? "grab" : "not-allowed",
                      opacity: canDrag ? 1 : 0.55,
                    }}
                    title={canDrag ? "Arraste para outro time" : "Jogador sem ID"}
                  >
                    <span className="tg-player-name" title={p.name}>
                      {p.name}
                    </span>
                    <span style={{ fontWeight: 900, color: "var(--text-2)", fontSize: 12 }}>
                      {p.sex} • {p.score.toFixed(1)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );

  // ==================== UI (AJUSTADA) ====================
  const selectedPlayersCount = selectedPlayerIds.length;
  const selectedSkillsCount = selectedSkills.length;

  const TopBar = (
    <div className="ui-card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
          <div className="input-group-compact" style={{ margin: 0 }}>
            <label style={{ marginRight: 6 }}>Times:</label>
            <InputNumber min={1} value={teamCount} onChange={(v) => setTeamCount(Number(v || 1))} style={{ width: 100 }} />
          </div>
          <div className="input-group-compact" style={{ margin: 0 }}>
            <label style={{ marginRight: 6 }}>Jogadores/time:</label>
            <InputNumber min={2} value={playersPerTeam} onChange={(v) => setPlayersPerTeam(Number(v || 2))} style={{ width: 120 }} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {step !== "result" && (
            <button
              type="button"
              className="action-btn-compact save"
              onClick={handleRecoverLatest}
              disabled={recovering}
              title="Carregar a última sessão de times gerados"
            >
              <HistoryOutlined /> {recovering ? "Carregando..." : "Recuperar última geração"}
            </button>
          )}
          <button type="button" className="action-btn-compact reset" onClick={resetAll} title="Reiniciar">
            Limpar
          </button>
        </div>
      </div>
      <div className="config-info-compact" style={{ marginTop: 10 }}>
        Precisa de <b>{needed}</b> jogadores • Selecionados: <b>{selectedPlayersCount}</b>
        {step !== "players" && <> • Skills selecionadas: <b>{selectedSkillsCount}</b></>}
      </div>
    </div>
  );

  const PlayersStep = (
    <div
      className="ui-card"
      style={{
        padding: 15,
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        overflow: 'hidden',
      }}
    >
      <div className="players-header-compact" style={{ flexShrink: 0 }}>
        <h3>Selecionar Jogadores</h3>
        <span className="players-count ui-badge">{selectedPlayersCount}</span>
      </div>
      <button
        type="button"
        className="action-btn-compact generate"
        onClick={goNext}
        disabled={!canGoNext}
        title={!canGoNext ? `Selecione ${needed} jogadores` : "Ir para skills"}
        style={{ marginBottom: 10, flexShrink: 0, width: 200 }}
      >
        Próximo: Skills
      </button>
      <Input
        placeholder="Buscar jogador..."
        value={playerQuery}
        onChange={(e) => setPlayerQuery(e.target.value)}
        style={{ marginBottom: 12, flexShrink: 0 }}
      />
      {playersLoading ? (
        <div style={{ padding: 16, flexShrink: 0 }}><Spin /></div>
      ) : (
        <div
          className="players-selection-grid ui-scroll"
          style={{
            flex: 1,
            overflowY: 'auto',
            minHeight: 0,
          }}
        >
          {filteredPlayers.map((p) => {
            const checked = selectedPlayerIds.includes(p.id);
            const isDisabled = !checked && selectedPlayerIds.length >= needed;

            return (
              <label
                key={p.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  padding: "10px 12px",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--r-sm)",
                  background: "var(--surface-2)",
                  cursor: isDisabled ? "not-allowed" : "pointer",
                  opacity: isDisabled ? 0.5 : 1,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Checkbox
                    checked={checked}
                    disabled={isDisabled}
                    onChange={(e: CheckboxChangeEvent) => togglePlayer(p.id, e.target.checked)}
                  />
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ fontWeight: 900, color: "#fff" }}>{p.name}</span>
                  </div>
                </div>
                <Tag color={p.sex === "M" ? "blue" : "magenta"} style={{ fontWeight: 900 }}>
                  {p.sex}
                </Tag>
              </label>
            );
          })}
          {filteredPlayers.length === 0 && (
            <div style={{ padding: 12, color: "var(--text-2)", fontWeight: 800 }}>
              Nenhum jogador encontrado.
            </div>
          )}
        </div>
      )}
      <div
        style={{
          marginTop: 12,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 10,
          flexShrink: 0,
        }}
      >
        <Text style={{ color: "var(--text-2)", fontWeight: 800 }}>
          Selecionados: {selectedPlayersCount} / {needed}
        </Text>
      </div>
    </div>
  );

  const SkillsStep = (
    <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 20 }}>
      <div className="ui-card" style={{ padding: 15 }}>
        <div className="players-header-compact">
          <h3>Selecionar Skills</h3>
          <span className="players-count ui-badge">{selectedSkillsCount}</span>
        </div>
        <Input placeholder="Buscar skill..." value={skillQuery} onChange={(e) => setSkillQuery(e.target.value)} style={{ marginBottom: 12 }} />
        {skillsLoading ? (
          <div style={{ padding: 16 }}><Spin /></div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: "52vh", overflow: "auto" }}>
            {filteredSkills.map((s) => {
              const checked = selectedSkillMap[s.id] != null;
              const weight = selectedSkillMap[s.id] ?? 1;
              return (
                <div key={s.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "10px 12px", border: "1px solid var(--border)", borderRadius: "var(--r-sm)", background: "var(--surface-2)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Checkbox checked={checked} onChange={(e) => toggleSkill(s.id, e.target.checked)} />
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span style={{ fontWeight: 900, color: "#fff" }}>{s.name}</span>
                    </div>
                  </div>
                  {checked ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Text style={{ color: "var(--text-2)", fontWeight: 900 }}>Peso</Text>
                      <InputNumber min={0} max={10} step={0.5} value={weight} onChange={(v) => setSkillWeight(s.id, Number(v ?? 1))} style={{ width: 90 }} />
                    </div>
                  ) : (
                    <Text style={{ color: "var(--text-2)", fontWeight: 800 }}>—</Text>
                  )}
                </div>
              );
            })}
            {filteredSkills.length === 0 && <div style={{ padding: 12, color: "var(--text-2)", fontWeight: 800 }}>Nenhuma skill encontrada.</div>}
          </div>
        )}
        <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <button type="button" className="action-btn-compact copy" onClick={goBackToPlayers} title="Voltar">Voltar</button>
          <button type="button" className="action-btn-compact generate" onClick={generate} disabled={!canGenerate || generating} title={!canGenerate ? "Selecione pelo menos 1 skill" : "Gerar times"}>
            {generating ? "Gerando..." : "Gerar Times"}
          </button>
        </div>
      </div>
      <div className="ui-card" style={{ padding: 15, height: "fit-content" }}>
        <div className="players-header-compact" style={{ marginBottom: 10 }}>
          <h3>⚖️ Pesos e Regras</h3>
          <span className="players-count ui-badge">M/F</span>
        </div>
        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
            <Text style={{ color: "#fff", fontWeight: 900 }}>Times mistos</Text>
            <Tag color={sexBalanceEnabled ? "green" : "red"} style={{ fontWeight: 900 }}>{sexBalanceEnabled ? "Ativo" : "Inativo"}</Tag>
          </div>
          <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 10 }}>
            <Checkbox checked={sexBalanceEnabled} onChange={(e) => setSexBalanceEnabled(e.target.checked)}>Balancear quantidade de homens por time</Checkbox>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <Text style={{ color: "#fff", fontWeight: 900 }}>Dif. máxima de homens:</Text>
              <InputNumber min={0} max={10} value={maxMaleDiff} onChange={(v) => setMaxMaleDiff(Number(v ?? 1))} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <Text style={{ color: "#fff", fontWeight: 900 }}>Multiplicador M:</Text>
              <InputNumber min={0.5} max={2} step={0.01} value={multM} onChange={(v) => setMultM(Number(v ?? 1))} />
              <Text style={{ color: "#fff", fontWeight: 900 }}>Multiplicador F:</Text>
              <InputNumber min={0.5} max={2} step={0.01} value={multF} onChange={(v) => setMultF(Number(v ?? 0.92))} />
            </div>
            <div style={{ borderTop: "1px solid var(--border)", marginTop: 12, paddingTop: 12 }}>
              <Checkbox
                checked={balancePositions}
                onChange={(e) => setBalancePositions(e.target.checked)}
              >
                Garantir posições obrigatórias
              </Checkbox>
              {balancePositions && (
                <div style={{ marginTop: 8 }}>
                  <Text style={{ color: "#fff", fontWeight: 900 }}>Posições obrigatórias:</Text>
                  <Select
                    mode="multiple"
                    placeholder="Selecione as posições"
                    value={requiredPositions}
                    onChange={setRequiredPositions}
                    style={{ width: "100%" }}
                  >
                    {availablePositions.map(p => (
                      <Select.Option key={p.id} value={p.id}>{p.name}</Select.Option>
                    ))}
                  </Select>
                </div>
              )}
            </div>
            <div className="config-info-compact" style={{ marginTop: 10 }}>Dica: ajuste os multiplicadores para compensar diferença de nível entre M/F.</div>
          </div>
        </div>
      </div>
    </div>
  );

  const ResultStep = (
    <div className="results-section ui-card" style={{ height: "calc(100dvh - 230px)" }}>
      <div className="results-header">
        <h2>Times Gerados</h2>
        <div className="results-stats">
          {teams.length ? <span className="teams-count-badge">{teams.length} times</span> : null}
          <div className="action-buttons-compact">
            <button type="button" className="action-btn-compact reset" onClick={resetAll} title="Novo sorteio">Novo sorteio</button>
          </div>
        </div>
      </div>
      {generating ? (
        <div className="empty-state"><Spin /><div style={{ marginTop: 10, color: "var(--text-2)", fontWeight: 800 }}>Calculando balanceamento...</div></div>
      ) : teams.length ? (
        <>
          <div className="teams-summary" style={{ justifyContent: "space-between" }}>
            <span style={{ color: "var(--primary)", fontWeight: 900 }}>Session: <span style={{ color: "#fff" }}>{result?.sessionId}</span></span>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" className="reshuffle-btn" onClick={generate} title="Reembaralhar com as mesmas seleções" disabled={!canGenerate || generating}>Reembaralhar</button>
              <Button type="default" icon={<SwapOutlined />} onClick={() => setAdjustModalOpen(true)}>Ajustar Times</Button>
              <Button type="primary" icon={<PlayCircleOutlined />} onClick={() => setCourtModalOpen(true)}>Iniciar Sessão</Button>
            </div>
          </div>
          {renderTeamsGrid(true)}
        </>
      ) : (
        <div className="empty-state"><div className="empty-icon">🧠</div><h3>Nenhum time gerado</h3><p>Volte e gere novamente.</p></div>
      )}
    </div>
  );

  return (
    <div className="main-content" style={{ gridTemplateColumns: "1fr", height: "calc(100vh - 90px)", overflow: "hidden" }}>
      <div
        className="controls-column"
        style={{
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          height: "100%",
        }}
      >
        {TopBar}
        {step === "players" && PlayersStep}
        {step === "skills" && SkillsStep}
        {step === "result" && ResultStep}
      </div>
      {result?.sessionId && (
        <CourtSetupModal
          open={courtModalOpen}
          sessionId={result.sessionId}
          teams={teams.map((team) => ({
            teamIndex: team.teamIndex,
            name: `Time ${team.teamIndex}`,
            players: team.players.map((player, playerIndex) => ({
              id:
                player.playerId ||
                `${team.teamIndex}-${player.name}-${playerIndex}`,
              name: player.name,
            })),
          }))}
          onCancel={() => setCourtModalOpen(false)}
          onConfirm={handleStartSession}
        />
      )}
      <Modal
        title={
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "#2bd96b", fontSize: 28 }}>Ajustar Times</span>
            <div style={{ display: "flex", gap: 8 }}>
              <Button type="primary" onClick={() => setAdjustModalOpen(false)}>
                Concluído
              </Button>
              <Button onClick={() => setAdjustModalOpen(false)}>
                Fechar
              </Button>
            </div>
          </div>
        }
        open={adjustModalOpen}
        onCancel={() => setAdjustModalOpen(false)}
        footer={null}
        closable={false}
        width="100vw"
        style={{ top: 0, maxWidth: "100vw", height: "100vh", padding: 0, overflow: "hidden" }}
        styles={{
          body: {
            height: "calc(100vh - 86px)",
            padding: 24,
            overflow: "auto",
            backgroundColor: "#0d0d0d",
          },
        }}
      >
        {teams.length > 0 ? (
          renderTeamsGrid(false)
        ) : (
          <div style={{ textAlign: "center", padding: 40, color: "#aaa" }}>
            Nenhum time disponível para ajuste.
          </div>
        )}
      </Modal>
    </div>
  );
}