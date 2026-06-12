import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  Button,
  InputNumber,
  Space,
  Typography,
  message,
  Row,
  Col,
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

  const [matchWinner, setMatchWinner] = useState<'home' | 'away' | null>(null);
  const [, setSetFinished] = useState(false);
  const [currentSetWinner, setCurrentSetWinner] = useState<'home' | 'away' | null>(null);
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

  const targetPoints = useMemo(() => {
    if (setsToWin === 1) {
      return editablePointsPerSet;
    }

    if (setsToWin === 2) {
      const isTieBreak = homeSetsWon === 1 && awaySetsWon === 1;
      return isTieBreak ? editableTieBreakPoints : editablePointsPerSet;
    }

    if (setsToWin === 3) {
      const isTieBreak = homeSetsWon === 2 && awaySetsWon === 2;
      return isTieBreak ? editableTieBreakPoints : editablePointsPerSet;
    }

    return editablePointsPerSet;
  }, [
    setsToWin,
    editablePointsPerSet,
    editableTieBreakPoints,
    homeSetsWon,
    awaySetsWon,
  ]);

  const finishInfo = useMemo(() => {
    const reachedTarget = homeScore >= targetPoints || awayScore >= targetPoints;
    const hasAdvantage = Math.abs(homeScore - awayScore) >= minAdvantage;

    if (!reachedTarget || !hasAdvantage) {
      return null;
    }

    const winner: 'home' | 'away' = homeScore > awayScore ? 'home' : 'away';

    return {
      winner,
      key: `${currentSet}-${homeScore}-${awayScore}-${winner}-${targetPoints}-${homeSetsWon}-${awaySetsWon}`,
    };
  }, [
    homeScore,
    awayScore,
    targetPoints,
    minAdvantage,
    currentSet,
    homeSetsWon,
    awaySetsWon,
  ]);

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

      http
        .get(`/teams/session/${generationSessionId}`)
        .then((res) => {
          const teams: Team[] = res.data;

          setHomeTeam(teams.find((t) => t.teamIndex === homeTeamIndex) || null);
          setAwayTeam(teams.find((t) => t.teamIndex === awayTeamIndex) || null);
        })
        .catch(() => message.error('Erro ao carregar times'))
        .finally(() => setLoading(false));
    } else {
      setHomeTeam(null);
      setAwayTeam(null);
    }

    if (championshipId && matchId) {
      http
        .get(`/championships/${championshipId}/matches/${matchId}`)
        .then((res) => {
          const m = res.data;

          if (m.setsToWin) setSetsToWin(m.setsToWin);
          if (m.pointsPerSet) setEditablePointsPerSet(m.pointsPerSet);
          if (m.tieBreakPoints) setEditableTieBreakPoints(m.tieBreakPoints);
        })
        .catch(() => console.warn('Não foi possível carregar detalhes da partida'));
    }
  }, [
    visible,
    championshipId,
    matchId,
    generationSessionId,
    homeTeamIndex,
    awayTeamIndex,
  ]);

  useEffect(() => {
    if (!finishInfo) {
      setSetFinished(false);
      setCurrentSetWinner(null);
      setDismissedFinishKey(null);
      return;
    }

    if (dismissedFinishKey === finishInfo.key) {
      return;
    }

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

    const newSets = [
      ...sets,
      {
        setNumber: currentSet,
        homeScore,
        awayScore,
      },
    ];

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
    if (finishInfo) {
      setDismissedFinishKey(finishInfo.key);
    }

    setSetFinished(false);
    setCurrentSetWinner(null);
    setConfirmSetModalOpen(false);
  };

  const cancelResultModal = () => {
    if (finishInfo) {
      setDismissedFinishKey(finishInfo.key);
    }

    setMatchWinner(null);
    setResultModalVisible(false);
    setSetFinished(false);
    setCurrentSetWinner(null);
  };

  const increment = (team: 'home' | 'away') => {
    if (finishInfo) {
      return;
    }

    if (team === 'home') {
      setHomeScore((prev) => prev + 1);
    } else {
      setAwayScore((prev) => prev + 1);
    }
  };

  const decrement = (team: 'home' | 'away') => {
    if (team === 'home' && homeScore > 0) {
      setHomeScore((prev) => prev - 1);
    } else if (team === 'away' && awayScore > 0) {
      setAwayScore((prev) => prev - 1);
    }
  };

  const handleSave = async () => {
    if (!matchWinner) return;

    setSaving(true);

    try {
      const finalSets =
        setsToWin === 1
          ? [
              {
                setNumber: 1,
                homeScore,
                awayScore,
              },
            ]
          : sets;

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

      if (onSave) {
        await onSave(payload);
      } else {
        await http.post(`/championships/${championshipId}/matches/result`, payload);
      }

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

  const handleDragStart = (e: React.DragEvent, side: 'left' | 'right') => {
    e.dataTransfer.setData('text/plain', side);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, side: 'left' | 'right') => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    if (side === 'left') {
      setDragOverLeft(true);
    } else {
      setDragOverRight(true);
    }
  };

  const handleDragLeave = (side: 'left' | 'right') => {
    if (side === 'left') {
      setDragOverLeft(false);
    } else {
      setDragOverRight(false);
    }
  };

  const handleDrop = (e: React.DragEvent, targetSide: 'left' | 'right') => {
    e.preventDefault();

    setDragOverLeft(false);
    setDragOverRight(false);

    const sourceSide = e.dataTransfer.getData('text/plain') as 'left' | 'right';

    if (sourceSide !== targetSide) {
      setSwapped((prev) => !prev);
    }
  };

  const leftTeam = swapped ? 'away' : 'home';
  const rightTeam = swapped ? 'home' : 'away';

  const renderTeamCard = (side: 'left' | 'right') => {
    const teamKey = side === 'left' ? leftTeam : rightTeam;
    const isHome = teamKey === 'home';

    const team = isHome ? homeTeam : awayTeam;
    const score = isHome ? homeScore : awayScore;
    const teamName = isHome ? getHomeName() : getAwayName();
    const dragOver = side === 'left' ? dragOverLeft : dragOverRight;

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
        }}
      >
        <Card
          variant="borderless"
          style={{
            backgroundColor: '#f0f2f5',
            padding: '8px 0',
          }}
        >
          <Title level={3} style={styles.title}>
            {teamName}
          </Title>

          {team && (
            <div
              style={{
                marginTop: 4,
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'center',
                gap: '4px',
              }}
            >
              {team.players.map((p, idx) => (
                <span key={p.id} style={styles.players}>
                  {p.name}
                  {idx < team.players.length - 1 && ' | '}
                </span>
              ))}
            </div>
          )}

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 20,
              marginTop: 8,
            }}
          >
            <div style={styles.score}>{score}</div>

            {setsToWin > 1 && (
              <div
                style={{
                  fontSize: 80,
                  fontWeight: 'bold',
                  color: '#01ff69',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontSize: 24, color: '#aaa' }}>Sets</span>
                <span>{isHome ? homeSetsWon : awaySetsWon}</span>
              </div>
            )}
          </div>

          <Space size="middle" style={{ marginTop: 16 }}>
            <Button
              size="large"
              icon={<MinusOutlined />}
              onClick={() => decrement(isHome ? 'home' : 'away')}
              style={styles.decrementButton}
            />

            <Button
              size="large"
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => increment(isHome ? 'home' : 'away')}
              style={styles.incrementButton}
            />
          </Space>
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
      width="100vw"
      style={{
        top: 0,
        maxWidth: '100vw',
        height: '100vh',
        padding: 0,
        overflow: 'hidden',
      }}
      styles={{
        body: {
          height: 'calc(100vh - 55px)',
          padding: 16,
          overflow: 'auto',
          position: 'relative',
        },
      }}
      closeIcon={<CloseOutlined style={{ color: '#01ff69' }} />}
    >
      <div style={{ position: 'relative', minHeight: '100%' }}>
        <img
          src="/logo_minimal_light.svg"
          alt="BoraVer"
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '240px',
            height: 'auto',
            opacity: 0.1,
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />

        {loading ? (
          <div style={{ textAlign: 'center', padding: 20, fontSize: 40 }}>
            Carregando times...
          </div>
        ) : (
          <>
            <div
              style={{
                textAlign: 'left',
                marginBottom: 16,
                position: 'relative',
                zIndex: 1,
                display: 'flex',
                gap: 8,
                alignItems: 'center',
                flexWrap: 'wrap',
              }}
            >
              <Tooltip title="Configurar regras">
                <Button
                  icon={<SettingOutlined />}
                  onClick={() => setSettingsVisible(true)}
                />
              </Tooltip>

              <Tooltip title="Registrar WO (Walkover)">
                <Button
                  icon={<WarningOutlined />}
                  onClick={() => setWoModalVisible(true)}
                  danger
                >
                  Registrar WO
                </Button>
              </Tooltip>

              <Tooltip title="Inverter lados">
                <Button
                  icon={<SwapOutlined />}
                  onClick={() => setSwapped((prev) => !prev)}
                  style={{ marginLeft: 'auto' }}
                />
              </Tooltip>

              {setsToWin > 1 && (
                <Tag
                  color="blue"
                  style={{
                    fontSize: 18,
                    padding: '6px 16px',
                  }}
                >
                  Set {currentSet} | {homeSetsWon} x {awaySetsWon}
                </Tag>
              )}
            </div>

            <Row
              gutter={[16, 32]}
              justify="center"
              align="middle"
              style={{
                minHeight: '70vh',
                position: 'relative',
                zIndex: 1,
              }}
            >
              <Col xs={24} md={10} style={{ textAlign: 'center' }}>
                {renderTeamCard('left')}
              </Col>

              <Col xs={24} md={4} style={{ textAlign: 'center' }}>
                <Text style={{ fontSize: 68 }}></Text>
              </Col>

              <Col xs={24} md={10} style={{ textAlign: 'center' }}>
                {renderTeamCard('right')}
              </Col>
            </Row>
          </>
        )}

        <Modal
          title="Fim do Set"
          open={confirmSetModalOpen}
          onCancel={cancelSetConfirmation}
          maskClosable={false}
          keyboard={false}
          footer={[
            <Button key="cancel" onClick={cancelSetConfirmation}>
              Continuar jogando
            </Button>,
            <Button key="confirm" type="primary" onClick={confirmSet}>
              Confirmar set
            </Button>,
          ]}
          centered
          closeIcon={<CloseOutlined style={{ color: '#01ff69' }} />}
        >
          <div style={{ textAlign: 'center' }}>
            <Title level={4} style={{ color: '#01ff69' }}>
              {currentSetWinner === 'home' ? getHomeName() : getAwayName()} venceu
              o set {currentSet}!
            </Title>

            <Text style={{ fontSize: 18 }}>
              Placar do set: {homeScore} x {awayScore}
            </Text>

            <br />

            <Text style={{ fontSize: 16, color: '#aaa' }}>
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
          closeIcon={<CloseOutlined style={{ color: '#01ff69' }} />}
        >
          <div style={{ textAlign: 'center' }}>
            <Title level={3} style={{ color: '#01ff69' }}>
              Vencedor: {matchWinner === 'home' ? getHomeName() : getAwayName()}
            </Title>

            {setsToWin > 1 && (
              <>
                <Text style={{ fontSize: 20 }}>
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
                color: '#000',
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
            >
              OK
            </Button>,
          ]}
          closeIcon={<CloseOutlined style={{ color: '#01ff69' }} />}
        >
          <div style={{ marginBottom: 16 }}>
            <label>Pontos por set: </label>
            <InputNumber
              min={1}
              value={editablePointsPerSet}
              onChange={(val) => setEditablePointsPerSet(val || 1)}
            />
          </div>

          {setsToWin > 1 && (
            <div style={{ marginBottom: 16 }}>
              <label>Pontos no tie-break: </label>
              <InputNumber
                min={1}
                value={editableTieBreakPoints}
                onChange={(val) => setEditableTieBreakPoints(val || 1)}
              />
            </div>
          )}

          <div>
            <label>Vantagem mínima: </label>
            <InputNumber
              min={1}
              value={minAdvantage}
              onChange={(val) => setMinAdvantage(val || 1)}
            />
          </div>
        </Modal>

        <Modal
          title="Registrar Walkover (WO)"
          open={woModalVisible}
          onCancel={() => setWoModalVisible(false)}
          footer={[
            <Button key="cancel" onClick={() => setWoModalVisible(false)}>
              Cancelar
            </Button>,
            <Button
              key="submit"
              type="primary"
              danger
              onClick={handleRegisterWO}
              loading={saving}
            >
              Confirmar WO
            </Button>,
          ]}
          closeIcon={<CloseOutlined style={{ color: '#01ff69' }} />}
          centered
        >
          <div style={{ marginBottom: 16 }}>
            <Text>
              Selecione o time que <strong>compareceu</strong> e vencerá por WO:
            </Text>
          </div>

          <Radio.Group
            onChange={(e) => setSelectedWoWinner(e.target.value)}
            value={selectedWoWinner}
            style={{ width: '100%' }}
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              <Radio value="home">{getHomeName()} (mandante)</Radio>
              <Radio value="away">{getAwayName()} (visitante)</Radio>
            </Space>
          </Radio.Group>

          <div style={{ marginTop: 16, fontSize: 12, color: '#666' }}>
            O time vencedor receberá {setsToWin} sets de WO e 3 pontos na
            classificação.
          </div>
        </Modal>
      </div>
    </Modal>
  );
};

const styles: Record<string, React.CSSProperties> = {
  title: {
    fontSize: 50,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  players: {
    fontSize: 25,
    fontWeight: 'bold',
    lineHeight: 1.2,
  },
  score: {
    fontSize: 280,
    color: '#01ff69',
    fontWeight: 'bold',
    lineHeight: 1,
  },
  incrementButton: {
    backgroundColor: '#01ff69',
    borderColor: '#00aa09',
  },
  decrementButton: {
    backgroundColor: '#ff4d4f',
    borderColor: '#aa0000',
  },
};