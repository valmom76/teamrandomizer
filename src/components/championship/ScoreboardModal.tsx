import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  Button,
  InputNumber,
  Space,
  Typography,
  message,
  Card,
  Tooltip,
  Radio,
  Tag,
} from 'antd';
import {
  SettingOutlined,
  PlusOutlined,
  MinusOutlined,
  WarningOutlined,
  CloseOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import { http } from '../../api/http';
import type { Team } from '../types';

const { Title, Text } = Typography;

interface ScoreboardModalProps {
  visible: boolean;
  onClose: () => void;
  championshipId: string;
  matchId: string;
  homeTeamIndex: number;
  awayTeamIndex: number;
  generationSessionId?: string;
  homeTeamName?: string;
  awayTeamName?: string;
  onSuccess: () => void;
  onSave?: (data: any) => Promise<void>;
  setsToWin?: number;
  pointsPerSet?: number;
  tieBreakPoints?: number;
}

interface SetResult {
  setNumber: number;
  homeScore: number;
  awayScore: number;
}

type TeamSide = 'home' | 'away';
type BoardSide = 'left' | 'right';

export const ScoreboardModal: React.FC<ScoreboardModalProps> = ({
  visible,
  onClose,
  championshipId,
  matchId,
  homeTeamIndex,
  awayTeamIndex,
  generationSessionId,
  homeTeamName,
  awayTeamName,
  onSuccess,
  onSave,
  setsToWin: initialSetsToWin = 2,
  pointsPerSet: initialPointsPerSet = 25,
  tieBreakPoints: initialTieBreakPoints = 15,
}) => {
  const isMobileByUserAgent = () =>
    /Android|iPhone|iPad|iPod|webOS/i.test(navigator.userAgent);

  const [isPortrait, setIsPortrait] = useState(
    () => window.innerHeight > window.innerWidth
  );

  const [isMobileDevice, setIsMobileDevice] = useState(
    () => isMobileByUserAgent() || window.innerWidth < 1024
  );

  useEffect(() => {
    const handleResize = () => {
      setIsPortrait(window.innerHeight > window.innerWidth);
      setIsMobileDevice(isMobileByUserAgent() || window.innerWidth < 1024);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  const [loading, setLoading] = useState(false);
  const [homeTeam, setHomeTeam] = useState<Team | null>(null);
  const [awayTeam, setAwayTeam] = useState<Team | null>(null);

  const [setsToWin, setSetsToWin] = useState(initialSetsToWin);
  const [editablePointsPerSet, setEditablePointsPerSet] = useState(initialPointsPerSet);
  const [editableTieBreakPoints, setEditableTieBreakPoints] = useState(initialTieBreakPoints);
  const [minAdvantage, setMinAdvantage] = useState(2);

  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);

  const [currentSet, setCurrentSet] = useState(1);
  const [sets, setSets] = useState<SetResult[]>([]);
  const [homeSetsWon, setHomeSetsWon] = useState(0);
  const [awaySetsWon, setAwaySetsWon] = useState(0);

  const [matchWinner, setMatchWinner] = useState<TeamSide | null>(null);
  const [, setSetFinished] = useState(false);
  const [currentSetWinner, setCurrentSetWinner] = useState<TeamSide | null>(null);
  const [confirmSetModalOpen, setConfirmSetModalOpen] = useState(false);
  const [resultModalVisible, setResultModalVisible] = useState(false);

  const [dismissedFinishKey, setDismissedFinishKey] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);

  const [woModalVisible, setWoModalVisible] = useState(false);
  const [selectedWoWinner, setSelectedWoWinner] = useState<string | null>(null);

  const [swapped, setSwapped] = useState(false);
  const [dragOverLeft, setDragOverLeft] = useState(false);
  const [dragOverRight, setDragOverRight] = useState(false);

  const scoreDragRef = useRef<{ y: number; team: TeamSide } | null>(null);

  const shouldStackScores = isMobileDevice && isPortrait;
  const shouldUseCompactCard = isMobileDevice || isPortrait;

  const middleButtonSize = shouldStackScores ? 38 : isMobileDevice ? 34 : 40;
  const scoreButtonSize = shouldStackScores ? 44 : isMobileDevice ? 42 : 56;

  const targetPoints = useMemo(() => {
    if (setsToWin === 1) return editablePointsPerSet;
    if (setsToWin === 2) {
      const isTieBreak = homeSetsWon === 1 && awaySetsWon === 1;
      return isTieBreak ? editableTieBreakPoints : editablePointsPerSet;
    }
    if (setsToWin === 3) {
      const isTieBreak = homeSetsWon === 2 && awaySetsWon === 2;
      return isTieBreak ? editableTieBreakPoints : editablePointsPerSet;
    }
    return editablePointsPerSet;
  }, [setsToWin, editablePointsPerSet, editableTieBreakPoints, homeSetsWon, awaySetsWon]);

  const finishInfo = useMemo(() => {
    const reachedTarget = homeScore >= targetPoints || awayScore >= targetPoints;
    const hasAdvantage = Math.abs(homeScore - awayScore) >= minAdvantage;
    if (!reachedTarget || !hasAdvantage) return null;
    const winner: TeamSide = homeScore > awayScore ? 'home' : 'away';
    return {
      winner,
      key: `${currentSet}-${homeScore}-${awayScore}-${winner}-${targetPoints}-${homeSetsWon}-${awaySetsWon}`,
    };
  }, [homeScore, awayScore, targetPoints, minAdvantage, currentSet, homeSetsWon, awaySetsWon]);

  const resetAll = () => {
    setHomeScore(0);
    setAwayScore(0);
    setCurrentSet(1);
    setSets([]);
    setHomeSetsWon(0);
    setAwaySetsWon(0);
    setMatchWinner(null);
    setSetFinished(false);
    setCurrentSetWinner(null);
    setConfirmSetModalOpen(false);
    setResultModalVisible(false);
    setDismissedFinishKey(null);
    setSwapped(false);
    setWoModalVisible(false);
    setSelectedWoWinner(null);
  };

  useEffect(() => {
    if (!visible) return;
    resetAll();
    if (generationSessionId) {
      setLoading(true);
      http.get(`/teams/session/${generationSessionId}`)
        .then((res) => {
          const teams: Team[] = res.data;
          setHomeTeam(teams.find((team) => team.teamIndex === homeTeamIndex) || null);
          setAwayTeam(teams.find((team) => team.teamIndex === awayTeamIndex) || null);
        })
        .catch(() => message.error('Erro ao carregar times'))
        .finally(() => setLoading(false));
    } else {
      setHomeTeam(null);
      setAwayTeam(null);
    }
    if (championshipId && matchId) {
      http.get(`/championships/${championshipId}/matches/${matchId}`)
        .then((res) => {
          const match = res.data;
          if (match.setsToWin) setSetsToWin(match.setsToWin);
          if (match.pointsPerSet) setEditablePointsPerSet(match.pointsPerSet);
          if (match.tieBreakPoints) setEditableTieBreakPoints(match.tieBreakPoints);
        })
        .catch(() => console.warn('Não foi possível carregar detalhes da partida'));
    }
  }, [visible, championshipId, matchId, generationSessionId, homeTeamIndex, awayTeamIndex]);

  useEffect(() => {
    if (!finishInfo) {
      setSetFinished(false);
      setCurrentSetWinner(null);
      setDismissedFinishKey(null);
      return;
    }
    if (dismissedFinishKey === finishInfo.key) return;
    setSetFinished(true);
    setCurrentSetWinner(finishInfo.winner);
    if (setsToWin === 1) {
      setMatchWinner(finishInfo.winner);
      setResultModalVisible(true);
      return;
    }
    setConfirmSetModalOpen(true);
  }, [finishInfo, dismissedFinishKey, setsToWin]);

  const confirmSet = () => {
    if (!currentSetWinner) return;
    const homeWon = currentSetWinner === 'home';
    const newSets = [...sets, { setNumber: currentSet, homeScore, awayScore }];
    const newHomeSets = homeWon ? homeSetsWon + 1 : homeSetsWon;
    const newAwaySets = !homeWon ? awaySetsWon + 1 : awaySetsWon;
    setSets(newSets);
    setHomeSetsWon(newHomeSets);
    setAwaySetsWon(newAwaySets);
    if (newHomeSets >= setsToWin || newAwaySets >= setsToWin) {
      setMatchWinner(newHomeSets >= setsToWin ? 'home' : 'away');
      setResultModalVisible(true);
    } else {
      setCurrentSet((prev) => prev + 1);
      setHomeScore(0);
      setAwayScore(0);
    }
    setSetFinished(false);
    setCurrentSetWinner(null);
    setConfirmSetModalOpen(false);
    setDismissedFinishKey(null);
  };

  const cancelSetConfirmation = () => {
    if (finishInfo) setDismissedFinishKey(finishInfo.key);
    setSetFinished(false);
    setCurrentSetWinner(null);
    setConfirmSetModalOpen(false);
  };

  const cancelResultModal = () => {
    if (finishInfo) setDismissedFinishKey(finishInfo.key);
    setMatchWinner(null);
    setResultModalVisible(false);
    setSetFinished(false);
    setCurrentSetWinner(null);
  };

  const increment = (team: TeamSide) => {
    if (finishInfo) return;
    if (team === 'home') setHomeScore((prev) => prev + 1);
    else setAwayScore((prev) => prev + 1);
  };

  const decrement = (team: TeamSide) => {
    if (team === 'home' && homeScore > 0) setHomeScore((prev) => prev - 1);
    else if (team === 'away' && awayScore > 0) setAwayScore((prev) => prev - 1);
  };

  const handleSave = async () => {
    if (!matchWinner) return;
    setSaving(true);
    try {
      const finalSets = setsToWin === 1 ? [{ setNumber: 1, homeScore, awayScore }] : sets;
      if (onSave) {
        await onSave({
          walkover: false,
          winnerTeamIndex: matchWinner === 'home' ? homeTeamIndex : awayTeamIndex,
          sets: finalSets,
        });
      } else {
        await http.post(`/championships/${championshipId}/matches/result`, {
          matchId,
          walkover: false,
          sets: finalSets,
        });
      }
      message.success('Resultado registrado com sucesso!');
      onSuccess();
      onClose();
    } catch (err: any) {
      message.error(err?.response?.data?.message ?? 'Erro ao registrar resultado');
    } finally {
      setSaving(false);
    }
  };

  const handleRegisterWO = async () => {
    if (!selectedWoWinner) {
      message.error('Selecione o time vencedor');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        matchId,
        walkover: true,
        winnerTeamIndex: selectedWoWinner === 'home' ? homeTeamIndex : awayTeamIndex,
        woWinnerPoints: editablePointsPerSet,
        sets: [],
      };
      if (onSave) await onSave(payload);
      else await http.post(`/championships/${championshipId}/matches/result`, payload);
      message.success('WO registrado!');
      onSuccess();
      onClose();
    } catch (err: any) {
      message.error(err?.response?.data?.message ?? 'Erro ao registrar WO');
    } finally {
      setSaving(false);
      setWoModalVisible(false);
    }
  };

  const getHomeName = () => homeTeamName || `Time ${homeTeamIndex}`;
  const getAwayName = () => awayTeamName || `Time ${awayTeamIndex}`;

  const handleDragStart = (e: React.DragEvent, side: BoardSide) => {
    e.dataTransfer.setData('text/plain', side);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, side: BoardSide) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (side === 'left') setDragOverLeft(true);
    else setDragOverRight(true);
  };

  const handleDragLeave = (side: BoardSide) => {
    if (side === 'left') setDragOverLeft(false);
    else setDragOverRight(false);
  };

  const handleDrop = (e: React.DragEvent, targetSide: BoardSide) => {
    e.preventDefault();
    setDragOverLeft(false);
    setDragOverRight(false);
    const sourceSide = e.dataTransfer.getData('text/plain') as BoardSide;
    if (sourceSide !== targetSide) setSwapped((prev) => !prev);
  };

  const leftTeam: TeamSide = swapped ? 'away' : 'home';
  const rightTeam: TeamSide = swapped ? 'home' : 'away';

  const renderMiddleControls = () => {
    const controlsDirection = shouldStackScores ? 'row' : 'column';

    return (
      <div
        style={{
          height: '100%',
          minHeight: 0,
          display: 'flex',
          flexDirection: controlsDirection,
          alignItems: 'center',
          justifyContent: 'center',
          gap: shouldStackScores ? 8 : 10,
          padding: shouldStackScores ? '8px 0' : '0 4px',
          zIndex: 2,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: controlsDirection,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          <Tooltip title="Fechar placar">
            <Button
              shape="circle"
              size={isMobileDevice ? 'middle' : 'large'}
              icon={<CloseOutlined />}
              onClick={onClose}
              style={{
                backgroundColor: '#1f1f1f',
                borderColor: '#01ff69',
                color: '#01ff69',
                fontWeight: 'bold',
                width: middleButtonSize,
                height: middleButtonSize,
                minWidth: middleButtonSize,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: shouldStackScores ? 5 : 15,
              }}
            />
          </Tooltip>

          <Tooltip title="Inverter lados">
            <Button
              shape="circle"
              size={isMobileDevice ? 'middle' : 'large'}
              icon={<SwapOutlined />}
              onClick={() => setSwapped((prev) => !prev)}
              style={{
                backgroundColor: '#333',
                borderColor: '#01ff69',
                color: '#01ff69',
                fontWeight: 'bold',
                fontSize: 16,
                width: middleButtonSize,
                height: middleButtonSize,
                minWidth: middleButtonSize,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: shouldStackScores ? 5 : 15,
              }}
            />
          </Tooltip>

          <Tooltip title="Configurar regras">
            <Button
              shape="circle"
              size="small"
              icon={<SettingOutlined />}
              onClick={() => setSettingsVisible(true)}
              style={{
                backgroundColor: '#333',
                borderColor: '#666',
                color: '#aaa',
                width: middleButtonSize,
                height: middleButtonSize,
                minWidth: middleButtonSize,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: shouldStackScores ? 5 : 15,
              }}
            />
          </Tooltip>

          <Tooltip title="Registrar WO">
            <Button
              shape="circle"
              size="small"
              icon={<WarningOutlined />}
              onClick={() => setWoModalVisible(true)}
              danger
              style={{
                width: middleButtonSize,
                height: middleButtonSize,
                minWidth: middleButtonSize,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            />
          </Tooltip>

          {setsToWin > 1 && (
            <Tag
              color="blue"
              style={{
                fontSize: 12,
                padding: '2px 6px',
                textAlign: 'center',
                margin: 0,
                whiteSpace: 'nowrap',
              }}
            >
              {homeSetsWon} x {awaySetsWon}
            </Tag>
          )}
        </div>
      </div>
    );
  };

  const renderTeamCard = (side: BoardSide) => {
    const teamKey = side === 'left' ? leftTeam : rightTeam;
    const isHome = teamKey === 'home';
    const team = isHome ? homeTeam : awayTeam;
    const score = isHome ? homeScore : awayScore;
    const teamName = isHome ? getHomeName() : getAwayName();
    const dragOver = side === 'left' ? dragOverLeft : dragOverRight;
    const teamType: TeamSide = isHome ? 'home' : 'away';

    return (
      <div
        draggable
        onDragStart={(e) => handleDragStart(e, side)}
        onDragOver={(e) => handleDragOver(e, side)}
        onDragLeave={() => handleDragLeave(side)}
        onDrop={(e) => handleDrop(e, side)}
        style={{
          cursor: 'grab',
          opacity: dragOver ? 0.7 : 1,
          border: dragOver ? '2px dashed #01ff69' : '2px solid transparent',
          borderRadius: 12,
          transition: 'opacity 0.2s, border 0.2s',
          height: '100%',
          minHeight: 0,
        }}
      >
        <Card
          variant="borderless"
          style={{
            backgroundColor: '#1a1a1a',
            padding: shouldUseCompactCard ? 8 : 'clamp(8px, 2vw, 16px)',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
          }}
          styles={{
            body: {
              padding: shouldUseCompactCard ? 8 : 'clamp(8px, 2vw, 16px)',
              flex: 1,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
            },
          }}
        >
          {/* Linha: [ - ] Nome (Sets) [ + ] */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: isMobileDevice ? 6 : 12,
              flexShrink: 0,
              marginBottom: shouldUseCompactCard ? 4 : 0,
            }}
          >
            {!isMobileDevice && (
              <Button
                size="large"
                icon={<MinusOutlined />}
                onClick={() => decrement(teamType)}
                style={{
                  backgroundColor: '#ff4d4f',
                  borderColor: '#aa0000',
                  color: '#fff',
                  fontWeight: 'bold',
                  height: scoreButtonSize,
                  width: scoreButtonSize,
                  minWidth: scoreButtonSize,
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20,
                  flexShrink: 0,
                }}
              />
            )}

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                flex: 1,
                minWidth: 0,
              }}
            >
              <Title
                level={3}
                style={{
                  fontSize: shouldStackScores
                    ? 'clamp(11px, 2.5vh, 16px)'
                    : isMobileDevice
                      ? 'clamp(14px, 3vw, 22px)'
                      : 'clamp(20px, 5vw, 50px)',
                  fontWeight: 'bold',
                  color: '#fff',
                  textAlign: 'center',
                  margin: 0,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '100%',
                }}
              >
                {teamName}
              </Title>

              {setsToWin > 1 && (
                <span
                  style={{
                    fontSize: shouldStackScores
                      ? 'clamp(11px, 2.5vh, 16px)'
                      : isMobileDevice
                        ? 'clamp(14px, 3vw, 22px)'
                        : 'clamp(20px, 5vw, 50px)',
                    fontWeight: 'bold',
                    color: '#01ff69',
                    whiteSpace: 'nowrap',
                  }}
                >
                  ({isHome ? homeSetsWon : awaySetsWon})
                </span>
              )}
            </div>

            {!isMobileDevice && (
              <Button
                size="large"
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => increment(teamType)}
                style={{
                  backgroundColor: '#01ff69',
                  borderColor: '#00aa09',
                  color: '#000',
                  fontWeight: 'bold',
                  height: scoreButtonSize,
                  width: scoreButtonSize,
                  minWidth: scoreButtonSize,
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20,
                  flexShrink: 0,
                }}
              />
            )}
          </div>

          {/* Jogadores (apenas desktop) */}
          {team && !isMobileDevice && (
            <div
              style={{
                marginTop: 4,
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'center',
                gap: '4px',
                flexShrink: 0,
              }}
            >
              {team.players.map((player, index) => (
                <span
                  key={player.id}
                  style={{
                    fontSize: 'clamp(12px, 2.5vw, 25px)',
                    fontWeight: 'bold',
                    color: '#ccc',
                    lineHeight: 1.2,
                  }}
                >
                  {player.name}
                  {index < team.players.length - 1 && ' | '}
                </span>
              ))}
            </div>
          )}

          {/* Score Gigante */}
          <div
            style={{
              flex: 1,
              minHeight: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                fontSize: shouldStackScores
                  ? 'clamp(60px, 20vh, 150px)'
                  : isMobileDevice
                    ? 'clamp(80px, 50vw, 180px)'
                    : 'clamp(80px, 25vw, 500px)',
                color: '#01ff69',
                fontWeight: 'bold',
                lineHeight: 1,
                textAlign: 'center',
                cursor: 'pointer',
                userSelect: 'none',
                touchAction: 'none',
              }}
              onClick={() => increment(teamType)}
              onMouseDown={(e) => {
                scoreDragRef.current = { y: e.clientY, team: teamType };
              }}
              onMouseUp={(e) => {
                if (!scoreDragRef.current) return;
                const deltaY = e.clientY - scoreDragRef.current.y;
                const team = scoreDragRef.current.team;
                if (deltaY > 20) decrement(team);
                scoreDragRef.current = null;
              }}
              onTouchStart={(e) => {
                const touch = e.touches[0];
                scoreDragRef.current = { y: touch.clientY, team: teamType };
              }}
              onTouchEnd={(e) => {
                if (!scoreDragRef.current) return;
                const touch = e.changedTouches[0];
                const deltaY = touch.clientY - scoreDragRef.current.y;
                const team = scoreDragRef.current.team;
                if (deltaY > 20) decrement(team);
                scoreDragRef.current = null;
              }}
              title={isMobileDevice ? 'Toque +1 | Arraste ↓ -1' : 'Clique +1 | Arraste para baixo -1'}
            >
              {score}
            </div>
          </div>
        </Card>
      </div>
    );
  };

  return (
    <Modal
      title=""
      open={visible}
      onCancel={onClose}
      footer={null}
      closable={false}
      width="100vw"
      style={{
        top: 0,
        maxWidth: '100vw',
        height: '100dvh',
        padding: 0,
        overflow: 'hidden',
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
      }}
      styles={{
        body: {
          height: '100dvh',
          boxSizing: 'border-box',
          padding: shouldStackScores
            ? 'clamp(8px, 1.5vw, 16px) clamp(4px, 1.5vw, 16px) calc(20px + env(safe-area-inset-bottom))'
            : 'clamp(4px, 1.5vw, 16px) clamp(4px, 1.5vw, 16px) calc(20px + env(safe-area-inset-bottom))',
          overflow: shouldStackScores ? 'auto' : 'hidden',
          position: 'relative',
        },
        mask: {
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
        },
        wrapper: {
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          position: 'fixed',
          overflow: 'hidden',
        },
      }}
    >
      <div
        style={{
          position: 'relative',
          minHeight: '100%',
          height: shouldStackScores ? 'auto' : '100%',
        }}
      >
        {loading ? (
          <div
            style={{
              textAlign: 'center',
              padding: 20,
              fontSize: 'clamp(20px, 5vw, 40px)',
              color: '#aaa',
            }}
          >
            Carregando times...
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: shouldStackScores
                ? '1fr'
                : 'minmax(0, 1fr) clamp(52px, 7vw, 110px) minmax(0, 1fr)',
              gridTemplateRows: shouldStackScores
                ? 'minmax(220px, 1fr) auto minmax(220px, 1fr)'
                : 'minmax(0, 1fr)',
              gap: shouldStackScores ? 8 : 'clamp(6px, 1vw, 16px)',
              alignItems: 'stretch',
              height: shouldStackScores ? 'auto' : '100%',
              minHeight: shouldStackScores ? '100%' : 0,
              boxSizing: 'border-box',
              paddingBottom: 16,
              position: 'relative',
              zIndex: 1,
            }}
          >
            <div style={{ minWidth: 0, minHeight: 0 }}>
              {renderTeamCard('left')}
            </div>

            {renderMiddleControls()}

            <div style={{ minWidth: 0, minHeight: 0 }}>
              {renderTeamCard('right')}
            </div>
          </div>
        )}

        <Modal
          title="Fim do Set"
          open={confirmSetModalOpen}
          onCancel={cancelSetConfirmation}
          maskClosable={false}
          keyboard={false}
          footer={[
            <Button key="cancel" onClick={cancelSetConfirmation}>Continuar jogando</Button>,
            <Button key="confirm" type="primary" onClick={confirmSet}>Confirmar set</Button>,
          ]}
          centered
          width="min(90vw, 400px)"
          closeIcon={<CloseOutlined style={{ color: '#01ff69' }} />}
        >
          <div style={{ textAlign: 'center' }}>
            <Title level={4} style={{ color: '#01ff69', fontSize: 'clamp(16px, 3vw, 20px)' }}>
              {currentSetWinner === 'home' ? getHomeName() : getAwayName()} venceu o set {currentSet}!
            </Title>
            <Text style={{ fontSize: 'clamp(16px, 2.5vw, 18px)' }}>
              Placar do set: {homeScore} x {awayScore}
            </Text>
            <br />
            <Text style={{ fontSize: 'clamp(14px, 2vw, 16px)', color: '#aaa' }}>
              {homeSetsWon + (currentSetWinner === 'home' ? 1 : 0)} x{' '}
              {awaySetsWon + (currentSetWinner === 'away' ? 1 : 0)} em sets
            </Text>
          </div>
        </Modal>

        <Modal
          title="Partida Finalizada"
          open={resultModalVisible}
          onCancel={cancelResultModal}
          footer={null}
          centered
          width="min(90vw, 500px)"
          closeIcon={<CloseOutlined style={{ color: '#01ff69' }} />}
        >
          <div style={{ textAlign: 'center' }}>
            <Title level={3} style={{ color: '#01ff69', fontSize: 'clamp(18px, 4vw, 24px)' }}>
              Vencedor: {matchWinner === 'home' ? getHomeName() : getAwayName()}
            </Title>
            {setsToWin > 1 && (
              <>
                <Text style={{ fontSize: 'clamp(16px, 2.5vw, 20px)' }}>
                  Sets: {homeSetsWon} x {awaySetsWon}
                </Text>
                <br />
              </>
            )}
            <Button
              size="large"
              type="primary"
              onClick={handleSave}
              loading={saving}
              style={{
                marginTop: 24,
                backgroundColor: '#01ff69',
                borderColor: '#00aa09',
                color: '#000',
                fontWeight: 'bold',
                height: 'clamp(40px, 8vw, 56px)',
                fontSize: 'clamp(16px, 2.5vw, 18px)',
              }}
            >
              Salvar Resultado
            </Button>
          </div>
        </Modal>

        <Modal
          title="Configurar Regras"
          open={settingsVisible}
          onCancel={() => setSettingsVisible(false)}
          footer={[
            <Button
              key="ok"
              type="primary"
              onClick={() => setSettingsVisible(false)}
              style={{ backgroundColor: '#01ff69', borderColor: '#00aa09', color: '#000' }}
            >
              OK
            </Button>,
          ]}
          width="min(90vw, 400px)"
          closeIcon={<CloseOutlined style={{ color: '#01ff69' }} />}
        >
          <div style={{ marginBottom: 16, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
            <label style={{ minWidth: 130 }}>Pontos por set: </label>
            <InputNumber min={1} value={editablePointsPerSet} onChange={(value) => setEditablePointsPerSet(value || 1)} style={{ width: '100%', maxWidth: 200 }} />
          </div>
          {setsToWin > 1 && (
            <div style={{ marginBottom: 16, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
              <label style={{ minWidth: 130 }}>Pontos no tie-break: </label>
              <InputNumber min={1} value={editableTieBreakPoints} onChange={(value) => setEditableTieBreakPoints(value || 1)} style={{ width: '100%', maxWidth: 200 }} />
            </div>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
            <label style={{ minWidth: 130 }}>Vantagem mínima: </label>
            <InputNumber min={1} value={minAdvantage} onChange={(value) => setMinAdvantage(value || 1)} style={{ width: '100%', maxWidth: 200 }} />
          </div>
        </Modal>

        <Modal
          title="Registrar Walkover (WO)"
          open={woModalVisible}
          onCancel={() => setWoModalVisible(false)}
          footer={[
            <Button key="cancel" onClick={() => setWoModalVisible(false)}>Cancelar</Button>,
            <Button key="submit" type="primary" danger onClick={handleRegisterWO} loading={saving}>Confirmar WO</Button>,
          ]}
          width="min(90vw, 450px)"
          closeIcon={<CloseOutlined style={{ color: '#01ff69' }} />}
          centered
        >
          <div style={{ marginBottom: 16 }}>
            <Text>Selecione o time que <strong>compareceu</strong> e vencerá por WO:</Text>
          </div>
          <Radio.Group onChange={(e) => setSelectedWoWinner(e.target.value)} value={selectedWoWinner} style={{ width: '100%' }}>
            <Space orientation="vertical" style={{ width: '100%' }}>
              <Radio value="home">{getHomeName()} (mandante)</Radio>
              <Radio value="away">{getAwayName()} (visitante)</Radio>
            </Space>
          </Radio.Group>
          <div style={{ marginTop: 16, fontSize: 12, color: '#666' }}>
            O time vencedor receberá {setsToWin} sets de WO e 3 pontos na classificação.
          </div>
        </Modal>
      </div>
    </Modal>
  );
};