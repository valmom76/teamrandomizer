import React, { useState, useEffect } from 'react';
import { Button, Card, InputNumber, Input, Row, Col, message, List, Modal, Form, Radio, Select, Typography } from 'antd';
import { usePlayers } from '../../hooks/usePlayers';
import { useManualTeams } from '../../hooks/useManualTeams';
import { useNavigate } from 'react-router-dom';
import './ManualTeamGenerator.css';
import { CloseOutlined } from '@ant-design/icons';

const { Title } = Typography;

export const ManualTeamGenerator: React.FC = () => {
  const { players, loading: playersLoading } = usePlayers();
  const { saveManualTeams, isSaving } = useManualTeams();
  const navigate = useNavigate();

  const [teamCount, setTeamCount] = useState(2);
  const [playersPerTeam, setPlayersPerTeam] = useState(4);
  const [teams, setTeams] = useState<{ [key: number]: string[] }>({});
  const [teamNames, setTeamNames] = useState<{ [key: number]: string }>({});

  const [modalVisible, setModalVisible] = useState(false);
  const [championshipName, setChampionshipName] = useState('');
  const [groupsCount, setGroupsCount] = useState(2);
  const [teamGroups, setTeamGroups] = useState<{ [teamIndex: number]: number }>({});
  const [matchesType, setMatchesType] = useState<'SINGLE' | 'HOME_AND_AWAY'>('SINGLE');
  const [qualifiedPerGroup, setQualifiedPerGroup] = useState(2);

  useEffect(() => {
    const initialTeams: { [key: number]: string[] } = {};
    const initialGroups: { [key: number]: number } = {};
    const initialNames: { [key: number]: string } = {};
    for (let i = 1; i <= teamCount; i++) {
      initialTeams[i] = [];
      initialGroups[i] = 1;
      initialNames[i] = '';
    }
    setTeams(initialTeams);
    setTeamGroups(initialGroups);
    setTeamNames(initialNames);
  }, [teamCount]);

  const addPlayerToTeam = (teamIndex: number, playerId: string) => {
    if (teams[teamIndex].length >= playersPerTeam) {
      message.warning(`Time ${teamIndex} já está cheio`);
      return;
    }
    setTeams(prev => ({ ...prev, [teamIndex]: [...prev[teamIndex], playerId] }));
  };

  const removePlayerFromTeam = (teamIndex: number, playerId: string) => {
    setTeams(prev => ({ ...prev, [teamIndex]: prev[teamIndex].filter(id => id !== playerId) }));
  };

  const totalSelected = Object.values(teams).flat().length;
  const needed = teamCount * playersPerTeam;
  const isComplete = totalSelected === needed;

  const handleOpenModal = () => {
    if (!isComplete) {
      message.error(`Selecione exatamente ${needed} jogadores (${totalSelected} selecionados)`);
      return;
    }
    setModalVisible(true);
  };

  const handleSaveChampionship = async () => {
    if (!championshipName.trim()) {
      message.error('Informe o nome do campeonato');
      return;
    }
    const payload = {
      name: championshipName,
      groupsCount,
      matchesType,
      qualifiedPerGroup,
      teams: Object.entries(teams).map(([idx, playerIds]) => ({
        teamIndex: parseInt(idx),
        playerIds,
        groupId: teamGroups[parseInt(idx)] || 1,
      })),
      teamNames: Object.entries(teamNames).reduce((acc, [idx, name]) => {
        if (name.trim()) acc[parseInt(idx)] = name.trim();
        return acc;
      }, {} as Record<number, string>),
    };
    try {
      const result = await saveManualTeams(payload);
      message.success('Campeonato criado com sucesso!');
      navigate(`/championships/${result.championshipId}`);
    } catch (err) {
      message.error('Erro ao criar campeonato');
    } finally {
      setModalVisible(false);
    }
  };

  if (playersLoading) return <div style={{ color: '#fff' }}>Carregando jogadores...</div>;

  return (
    <div style={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Title level={2} style={{ color: '#2bd96b', margin: '16px 0' }}>Criação de Campeonato</Title>
      <Row gutter={16} style={{ flex: 1, minHeight: 0 }}>
        {/* Coluna Configuração */}
        <Col span={8} style={{ height: '100%' }}>
          <Card
            title={<span style={{ color: '#2bd96b' }}>Configuração</span>}
            style={{ backgroundColor: '#1a1a1a', borderColor: '#333', height: '100%', display: 'flex', flexDirection: 'column' }}
            styles={{ body: { flex: 1, overflow: 'auto', padding: 16 }}}
          >
            <div style={{ marginBottom: 16 }}>
              <label style={{ color: '#fff' }}>Número de times: </label>
              <Input type="number" min={1} value={teamCount} onChange={e => setTeamCount(Math.max(1, Number(e.target.value) || 1))} style={{ width: 120 }} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ color: '#fff' }}>Jogadores por time: </label>
              <Input type="number" min={1} value={playersPerTeam} onChange={e => setPlayersPerTeam(Math.max(1, Number(e.target.value) || 1))} style={{ width: 120 }} />
            </div>
            <div style={{ color: '#aaa' }}>Total selecionado: {totalSelected} / {needed}</div>
            <Button type="primary" onClick={handleOpenModal} disabled={!isComplete} style={{ marginTop: 16, backgroundColor: '#2bd96b', borderColor: '#2bd96b', color: '#000', fontWeight: 'bold' }}>
              Criar Campeonato
            </Button>
          </Card>
        </Col>

        {/* Coluna Jogadores Disponíveis */}
        <Col span={8} style={{ height: '100%' }}>
          <Card
            title={<span style={{ color: '#2bd96b' }}>Jogadores Disponíveis</span>}
            style={{ backgroundColor: '#1a1a1a', borderColor: '#333', height: '100%', display: 'flex', flexDirection: 'column' }}
            styles={{ body: { flex: 1, overflow: 'auto', padding: 12 }}}
          >
            <List
              dataSource={players.filter(p => !Object.values(teams).flat().includes(p.id))}
              renderItem={player => (
                <List.Item
                  style={{ borderBottom: '1px solid #333' }}
                  actions={[
                    <Button size="small" onClick={() => {
                      const firstFreeTeam = Object.entries(teams).find(([_, ids]) => ids.length < playersPerTeam);
                      if (firstFreeTeam) addPlayerToTeam(parseInt(firstFreeTeam[0]), player.id);
                      else message.warning('Todos os times estão cheios');
                    }}>
                      Adicionar
                    </Button>
                  ]}
                >
                  <span style={{ color: '#fff' }}>{player.name} ({player.sex})</span>
                </List.Item>
              )}
            />
          </Card>
        </Col>

        {/* Coluna Times */}
        <Col span={8} style={{ height: '100%' }}>
          <Card
            title={<span style={{ color: '#2bd96b' }}>Times</span>}
            style={{ backgroundColor: '#1a1a1a', borderColor: '#333', height: '100%', display: 'flex', flexDirection: 'column' }}
            styles={{ body: { flex: 1, overflow: 'auto', padding: 12 }}}
          >
            {Object.entries(teams).map(([idx, playerIds]) => (
              <Card
                key={idx}
                type="inner"
                title={<span style={{ color: '#2bd96b' }}>Time {idx}</span>}
                style={{ marginBottom: 16, backgroundColor: '#262626', borderColor: '#444' }}                
                styles={{ body: { padding: 12 }}}
              >
                <Input
                  placeholder={`Nome do Time`}
                  value={teamNames[parseInt(idx)]}
                  onChange={e => setTeamNames(prev => ({ ...prev, [parseInt(idx)]: e.target.value }))}
                  style={{ marginBottom: 8 }}
                />
                <List
                  dataSource={playerIds}
                  renderItem={playerId => {
                    const player = players.find(p => p.id === playerId);
                    return (
                      <List.Item
                        style={{ borderBottom: '1px solid #333' }}
                        actions={[
                          <Button size="small" danger onClick={() => removePlayerFromTeam(parseInt(idx), playerId)}>Remover</Button>
                        ]}
                      >
                        <span style={{ color: '#fff' }}>{player?.name} ({player?.sex})</span>
                      </List.Item>
                    );
                  }}
                />
                <div style={{ color: '#aaa' }}>{playersPerTeam - playerIds.length} vagas restantes</div>
              </Card>
            ))}
          </Card>
        </Col>
      </Row>

      <Modal
        title={<span style={{ color: '#2bd96b' }}>Configurar Campeonato</span>}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={600}
        style={{ top: 20 }}
        closeIcon={<CloseOutlined style={{ color: '#2bd96b' }} />}
      >
        <Form layout="vertical">
          <Form.Item label="Nome do Campeonato" required>
            <Input value={championshipName} onChange={e => setChampionshipName(e.target.value)} />
          </Form.Item>
          <Form.Item label="Número de Grupos" required>
            <InputNumber min={1} value={groupsCount} onChange={val => setGroupsCount(val || 1)} />
          </Form.Item>
          <Form.Item label="Alocar Times aos Grupos">
            {Array.from({ length: teamCount }, (_, i) => i + 1).map(teamIdx => (
              <div key={teamIdx} style={{ marginBottom: 8, display: 'flex', alignItems: 'center' }}>
                <span style={{ width: 80, color: '#fff' }}>
                  {teamNames[teamIdx]?.trim() || `Time ${teamIdx}`}
                </span>
                <Select
                  value={teamGroups[teamIdx]}
                  onChange={val => setTeamGroups(prev => ({ ...prev, [teamIdx]: val }))}
                  style={{ width: 120 }}
                  options={Array.from({ length: groupsCount }, (_, g) => ({
                    value: g + 1,
                    label: `Grupo ${g + 1}`,
                  }))}
                />
              </div>
            ))}
          </Form.Item>
          <Form.Item label="Tipo de Partidas" required>
            <Radio.Group value={matchesType} onChange={e => setMatchesType(e.target.value)}>
              <Radio value="SINGLE">Somente Ida</Radio>
              <Radio value="HOME_AND_AWAY">Ida e Volta</Radio>
            </Radio.Group>
          </Form.Item>
          <Form.Item label="Classificados por grupo" required>
            <InputNumber min={1} value={qualifiedPerGroup} onChange={val => setQualifiedPerGroup(val || 1)} />
          </Form.Item>
          <Form.Item>
            <Button
              type="primary"
              onClick={handleSaveChampionship}
              loading={isSaving}
              block
              style={{ backgroundColor: '#2bd96b', borderColor: '#2bd96b', color: '#000', fontWeight: 'bold' }}
            >
              Criar Campeonato
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};