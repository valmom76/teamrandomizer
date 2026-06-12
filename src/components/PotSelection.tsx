import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button, Card, InputNumber, Space, Typography, Row, Col, Alert, Checkbox, Divider, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { http } from '../api/http';
import { usePlayers } from '../hooks/usePlayers';

const { Title, Text } = Typography;

type TeamGenerated = {
  teamIndex: number;
  players: { id: string; name: string; sex: string; score: number }[];
};

const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export const PotSelection: React.FC = () => {
  const navigate = useNavigate();
  const { players, loading, error } = usePlayers();
  const activePlayers = players.filter(p => p.active);

  const [teamCount, setTeamCount] = useState(8);
  const [playersPerTeam, setPlayersPerTeam] = useState(4);
  const [potes, setPotes] = useState<string[][]>([]);
  const [currentPoteIndex, setCurrentPoteIndex] = useState(0);
  const [generatedTeams, setGeneratedTeams] = useState<TeamGenerated[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setPotes(Array(playersPerTeam).fill(null).map(() => []));
  }, [playersPerTeam]);

  const selectedPlayerIds = useMemo(() => {
    const selected = new Set<string>();
    potes.forEach((pote, index) => {
      if (index !== currentPoteIndex) {
        pote.forEach(id => selected.add(id));
      }
    });
    return selected;
  }, [potes, currentPoteIndex]);

  const availablePlayers = useMemo(() => {
    return activePlayers.filter(p => !selectedPlayerIds.has(p.id));
  }, [activePlayers, selectedPlayerIds]);

  const isCurrentPoteComplete = potes[currentPoteIndex]?.length >= teamCount;
  const areAllPotesComplete = potes.every(pote => pote.length === teamCount);

  const togglePlayer = useCallback((playerId: string) => {
    if (isCurrentPoteComplete && !potes[currentPoteIndex].includes(playerId)) {
      message.warning(`Este pote já tem ${teamCount} jogadores.`);
      return;
    }
    setPotes(prev => {
      const newPotes = [...prev];
      const current = newPotes[currentPoteIndex];
      if (current.includes(playerId)) {
        newPotes[currentPoteIndex] = current.filter(id => id !== playerId);
      } else {
        newPotes[currentPoteIndex] = [...current, playerId];
      }
      return newPotes;
    });
  }, [currentPoteIndex, isCurrentPoteComplete, teamCount]);

  const goToNextPote = useCallback(() => {
    if (currentPoteIndex < potes.length - 1) {
      setCurrentPoteIndex(prev => prev + 1);
    }
  }, [currentPoteIndex, potes.length]);

  const goToPrevPote = useCallback(() => {
    if (currentPoteIndex > 0) {
      setCurrentPoteIndex(prev => prev - 1);
    }
  }, [currentPoteIndex]);

  const handleGenerate = useCallback(() => {
    const playerMap = new Map(activePlayers.map(p => [p.id, p]));

    const shuffledPotes = potes.map(pote => shuffleArray([...pote]));

    const potesInfo = shuffledPotes.map(pote =>
      pote.map(id => ({ id, sex: playerMap.get(id)!.sex }))
    );

    const numTimes = teamCount;
    const numPotes = playersPerTeam;

    const times: { players: (string | null)[]; menCount: number }[] = [];
    for (let i = 0; i < numTimes; i++) {
      times.push({ players: new Array(numPotes).fill(null), menCount: 0 });
    }

    for (let p = 0; p < numPotes; p++) {
      const jogadores = potesInfo[p];
      const homens = jogadores.filter(j => j.sex === 'M').map(j => j.id);
      const mulheres = jogadores.filter(j => j.sex === 'F').map(j => j.id);

      let timesDisponiveis = times
        .map((t, idx) => ({ idx, ocupado: t.players[p] !== null }))
        .filter(t => !t.ocupado)
        .map(t => t.idx);

      const timesOrdenados = times
        .map((t, idx) => ({ idx, menCount: t.menCount }))
        .sort((a, b) => a.menCount - b.menCount)
        .map(t => t.idx);

      let timesElegiveis = timesOrdenados.filter(idx =>
        timesDisponiveis.includes(idx) && times[idx].menCount < 3
      );

      if (homens.length > timesElegiveis.length) {
        message.error('Não há times suficientes com menos de 3 homens para alocar todos os homens. Tente novamente ou ajuste as seleções.');
        return;
      }

      for (const homem of homens) {
        const timeIdx = timesElegiveis.shift()!;
        times[timeIdx].players[p] = homem;
        times[timeIdx].menCount += 1;
        timesDisponiveis = timesDisponiveis.filter(idx => idx !== timeIdx);
      }

      for (const mulher of mulheres) {
        const timeIdx = timesDisponiveis.shift()!;
        times[timeIdx].players[p] = mulher;
      }
    }

    const timesCom4 = times.filter(t => t.menCount > 3);
    if (timesCom4.length > 0) {
      message.error('Erro inesperado: algum time ficou com 4 homens. Tente novamente.');
      return;
    }

    const newTeams: TeamGenerated[] = times.map((t, idx) => ({
      teamIndex: idx + 1,
      players: t.players.map(id => {
        const player = playerMap.get(id!);
        return {
          id: player!.id,
          name: player!.name,
          sex: player!.sex,
          score: 0,
        };
      }),
    }));

    setGeneratedTeams(newTeams);
    message.success('Times gerados com sucesso!');
  }, [potes, teamCount, playersPerTeam, activePlayers, areAllPotesComplete, shuffleArray]);

  const handleSave = async () => {
    if (generatedTeams.length === 0) return;
    setSaving(true);
    try {
      const payload = {
        teams: generatedTeams.map(team => ({
          teamIndex: team.teamIndex,
          players: team.players.map(p => ({
            id: p.id,
            name: p.name,
            sex: p.sex,
            score: 0,
          })),
        })),
      };
      const response = await http.post('/teams/generate-from-pots', payload);
      const result = response.data;
      navigate(`/teams/result?sessionId=${result.sessionId}&teams=${encodeURIComponent(JSON.stringify(result.teams))}`);
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Falha ao salvar times');
    } finally {
      setSaving(false);
    }
  };

  const resetAll = () => {
    setPotes(Array(playersPerTeam).fill(null).map(() => []));
    setCurrentPoteIndex(0);
    setGeneratedTeams([]);
  };

  if (loading) return <div>Carregando jogadores...</div>;
  if (error) return <Alert message="Erro" description={error} type="error" />;

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '16px 24px' }}>
      <Title level={3}>Seleção por Potes</Title>

      <Card style={{ marginBottom: 24 }}>
        <Row gutter={16}>
          <Col span={12}>
            <Text>Número de times:</Text>
            <InputNumber
              min={1}
              value={teamCount}
              onChange={val => setTeamCount(val || 1)}
              style={{ width: '100%' }}
            />
          </Col>
          <Col span={12}>
            <Text>Jogadores por time (potes):</Text>
            <InputNumber
              min={1}
              value={playersPerTeam}
              onChange={val => setPlayersPerTeam(val || 1)}
              style={{ width: '100%' }}
            />
          </Col>
        </Row>
      </Card>

      <Row gutter={16}>
        <Col span={6}>
          <Card title="Potes" style={{ height: '100%' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {potes.map((_, index) => {
                const disabled = !areAllPotesComplete && index !== currentPoteIndex && potes[index].length < teamCount;
                return (
                  <Button
                    key={index}
                    type={currentPoteIndex === index ? 'primary' : 'default'}
                    onClick={() => setCurrentPoteIndex(index)}
                    style={{
                      justifyContent: 'flex-start',
                      ...(disabled && { color: '#aaa', backgroundColor: '#333', borderColor: '#444' })
                    }}
                    disabled={disabled}
                  >
                    Pote {index + 1}: {potes[index].length}/{teamCount}
                  </Button>
                );
              })}
            </div>
          </Card>
        </Col>

        <Col span={18}>
          <Card
            title={`Pote ${currentPoteIndex + 1} – Selecione ${teamCount} jogadores`}
            extra={
              <Space>
                <Button
                  onClick={goToPrevPote}
                  disabled={currentPoteIndex === 0}
                  style={currentPoteIndex === 0 ? { color: '#aaa', backgroundColor: '#333', borderColor: '#444' } : {}}
                >
                  Anterior
                </Button>
                <Button
                  type="primary"
                  onClick={goToNextPote}
                  disabled={!isCurrentPoteComplete || currentPoteIndex === potes.length - 1}
                  style={
                    !isCurrentPoteComplete || currentPoteIndex === potes.length - 1
                      ? { color: '#aaa', backgroundColor: '#333', borderColor: '#444' }
                      : {}
                  }
                >
                  Próximo
                </Button>
              </Space>
            }
          >
            <Row gutter={[16, 16]}>
              {availablePlayers.map(player => {
                const isSelected = potes[currentPoteIndex]?.includes(player.id);
                const disabled = isCurrentPoteComplete && !isSelected;
                return (
                  <Col span={8} key={player.id}>
                    <Checkbox
                      checked={isSelected}
                      onChange={() => togglePlayer(player.id)}
                      disabled={disabled}
                      style={disabled ? { color: '#aaa' } : {}}
                    >
                      {player.name} ({player.sex})
                    </Checkbox>
                  </Col>
                );
              })}
              {availablePlayers.length === 0 && (
                <Col span={24}>
                  <Text type="secondary">Nenhum jogador disponível.</Text>
                </Col>
              )}
            </Row>
          </Card>
        </Col>
      </Row>

      <Divider />

      <Row justify="center" gutter={16} style={{ marginBottom: 24 }}>
        <Col>
          <Button
            type="primary"
            onClick={handleGenerate}
            disabled={!areAllPotesComplete}
            style={{ backgroundColor: '#01ff69', borderColor: '#01ff69' }}
          >
            Embaralhar Times
          </Button>
        </Col>
        {generatedTeams.length > 0 && (
          <Col>
            <Button
              type="primary"
              onClick={handleSave}
              loading={saving}
              disabled={saving}
              style={{ backgroundColor: '#2f9bff', borderColor: '#2f9bff' }}
            >
              Salvar no Servidor
            </Button>
          </Col>
        )}
        <Col>
          <Button onClick={resetAll}>Reiniciar</Button>
        </Col>
      </Row>

      {generatedTeams.length > 0 && (
        <Card title="Times Gerados" style={{ marginBottom: 24 }}>
          <Row gutter={[16, 16]}>
            {generatedTeams.map(team => (
              <Col span={8} key={team.teamIndex}>
                <Card type="inner" title={`Time ${team.teamIndex}`} style={{ backgroundColor: '#1a1a1a' }}>
                  {team.players.map(player => (
                    <div key={player.id}>
                      {player.name} ({player.sex})
                    </div>
                  ))}
                </Card>
              </Col>
            ))}
          </Row>
        </Card>
      )}
    </div>
  );
};