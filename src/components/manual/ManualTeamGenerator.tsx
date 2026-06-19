import React, { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  InputNumber,
  Input,
  Row,
  Col,
  message,
  List,
  Modal,
  Form,
  Radio,
  Select,
  Typography,
  Grid,
  Tabs,
  Space,
  Empty,
} from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import { usePlayers } from '../../hooks/usePlayers';
import { useManualTeams } from '../../hooks/useManualTeams';
import { useNavigate } from 'react-router-dom';
import './ManualTeamGenerator.css';

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

type ChampionshipFormat = 'GROUPS' | 'KNOCKOUT';
type MatchesType = 'SINGLE' | 'HOME_AND_AWAY';

type TeamsState = {
  [key: number]: string[];
};

export const ManualTeamGenerator: React.FC = () => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const { players, loading: playersLoading } = usePlayers();
  const { saveManualTeams, isSaving } = useManualTeams();
  const navigate = useNavigate();

  const [teamCount, setTeamCount] = useState(2);
  const [playersPerTeam, setPlayersPerTeam] = useState(4);
  const [teams, setTeams] = useState<TeamsState>({});
  const [teamNames, setTeamNames] = useState<{ [key: number]: string }>({});

  const [modalVisible, setModalVisible] = useState(false);
  const [championshipName, setChampionshipName] = useState('');
  const [championshipFormat, setChampionshipFormat] =
    useState<ChampionshipFormat>('GROUPS');
  const [groupsCount, setGroupsCount] = useState(2);
  const [teamGroups, setTeamGroups] = useState<{ [teamIndex: number]: number }>(
    {}
  );
  const [matchesType, setMatchesType] = useState<MatchesType>('SINGLE');
  const [qualifiedPerGroup, setQualifiedPerGroup] = useState(2);

  const [setsToWin, setSetsToWin] = useState(2);
  const [pointsPerSet, setPointsPerSet] = useState(25);
  const [tieBreakPoints, setTieBreakPoints] = useState(15);

  useEffect(() => {
    setTeams(prev => {
      const next: TeamsState = {};

      for (let i = 1; i <= teamCount; i++) {
        next[i] = prev[i] ?? [];
      }

      return next;
    });

    setTeamGroups(prev => {
      const next: { [key: number]: number } = {};

      for (let i = 1; i <= teamCount; i++) {
        next[i] = prev[i] ?? 1;
      }

      return next;
    });

    setTeamNames(prev => {
      const next: { [key: number]: string } = {};

      for (let i = 1; i <= teamCount; i++) {
        next[i] = prev[i] ?? '';
      }

      return next;
    });
  }, [teamCount]);

  useEffect(() => {
    setTeams(prev => {
      const next: TeamsState = {};

      Object.entries(prev).forEach(([idx, ids]) => {
        next[Number(idx)] = ids.slice(0, playersPerTeam);
      });

      return next;
    });
  }, [playersPerTeam]);

  const selectedPlayerIds = useMemo(() => {
    return new Set(Object.values(teams).flat());
  }, [teams]);

  const availablePlayers = useMemo(() => {
    return players.filter(player => !selectedPlayerIds.has(player.id));
  }, [players, selectedPlayerIds]);

  const totalSelected = Object.values(teams).flat().length;
  const needed = teamCount * playersPerTeam;
  const isComplete = totalSelected === needed;

  const isKnockout = championshipFormat === 'KNOCKOUT';
  const isPowerOfTwo = teamCount > 1 && (teamCount & (teamCount - 1)) === 0;

  const addPlayerToTeam = (teamIndex: number, playerId: string) => {
    if (selectedPlayerIds.has(playerId)) {
      message.warning('Este jogador já foi selecionado');
      return;
    }

    if ((teams[teamIndex] ?? []).length >= playersPerTeam) {
      message.warning(`Time ${teamIndex} já está cheio`);
      return;
    }

    setTeams(prev => ({
      ...prev,
      [teamIndex]: [...(prev[teamIndex] ?? []), playerId],
    }));
  };

  const removePlayerFromTeam = (teamIndex: number, playerId: string) => {
    setTeams(prev => ({
      ...prev,
      [teamIndex]: (prev[teamIndex] ?? []).filter(id => id !== playerId),
    }));
  };

  const addPlayerToFirstFreeTeam = (playerId: string) => {
    const firstFreeTeam = Object.entries(teams).find(
      ([, ids]) => ids.length < playersPerTeam
    );

    if (!firstFreeTeam) {
      message.warning('Todos os times estão cheios');
      return;
    }

    addPlayerToTeam(Number(firstFreeTeam[0]), playerId);
  };

  const handleOpenModal = () => {
    if (!isComplete) {
      message.error(
        `Selecione exatamente ${needed} jogadores (${totalSelected} selecionados)`
      );
      return;
    }

    setModalVisible(true);
  };

  const handleSaveChampionship = async () => {
    if (!championshipName.trim()) {
      message.error('Informe o nome do campeonato');
      return;
    }

    if (championshipFormat === 'KNOCKOUT' && !isPowerOfTwo) {
      message.error(
        'Para eliminatórias diretas, o número de times deve ser potência de 2 (2, 4, 8, 16...)'
      );
      return;
    }

    if (championshipFormat === 'GROUPS' && teamCount % 2 !== 0) {
      message.error('Para fase de grupos, o número de times deve ser par');
      return;
    }

    const payload = {
      name: championshipName.trim(),
      format: championshipFormat,
      groupsCount: championshipFormat === 'KNOCKOUT' ? 0 : groupsCount,
      qualifiedPerGroup:
        championshipFormat === 'KNOCKOUT' ? 0 : qualifiedPerGroup,
      matchesType,
      teams: Object.entries(teams).map(([idx, playerIds]) => ({
        teamIndex: Number(idx),
        playerIds,
        groupId:
          championshipFormat === 'KNOCKOUT'
            ? 1
            : teamGroups[Number(idx)] || 1,
      })),
      teamNames: Object.entries(teamNames).reduce((acc, [idx, name]) => {
        if (name.trim()) {
          acc[Number(idx)] = name.trim();
        }

        return acc;
      }, {} as Record<number, string>),
      setsToWin,
      pointsPerSet,
      tieBreakPoints,
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

  const renderConfigCard = () => (
    <Card
      title={<span className="manual-card-title">Configuração</span>}
      className="manual-card manual-config-card"
    >
      <Space orientation="vertical" size={16} className="manual-full-width">
        <div className="manual-field-grid">
          <div className="manual-field">
            <Text className="manual-label">Número de times</Text>
            <InputNumber
              min={2}
              value={teamCount}
              onChange={value => setTeamCount(Math.max(2, Number(value) || 2))}
              className="manual-number-input"
            />

            {isKnockout && !isPowerOfTwo && (
              <Text className="manual-error">
                Deve ser potência de 2: 2, 4, 8, 16...
              </Text>
            )}
          </div>

          <div className="manual-field">
            <Text className="manual-label">Jogadores por time</Text>
            <InputNumber
              min={1}
              value={playersPerTeam}
              onChange={value =>
                setPlayersPerTeam(Math.max(1, Number(value) || 1))
              }
              className="manual-number-input"
            />
          </div>
        </div>

        <div className="manual-summary-box">
          <Text className="manual-summary-label">Total selecionado</Text>
          <strong>
            {totalSelected} / {needed}
          </strong>
        </div>

        {!isMobile && (
          <Button
            type="primary"
            onClick={handleOpenModal}
            disabled={!isComplete}
            block
            className="manual-primary-button"
          >
            Criar Campeonato
          </Button>
        )}
      </Space>
    </Card>
  );

  const renderPlayersCard = () => (
    <Card
      title={<span className="manual-card-title">Jogadores Disponíveis</span>}
      className="manual-card"
    >
      <List
        className="manual-list"
        dataSource={availablePlayers}
        locale={{
          emptyText: (
            <Empty
              description="Nenhum jogador disponível"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          ),
        }}
        renderItem={player => (
          <List.Item
            className="manual-list-item"
            actions={[
              <Button
                size="small"
                className="manual-secondary-button"
                onClick={() => addPlayerToFirstFreeTeam(player.id)}
              >
                Adicionar
              </Button>,
            ]}
          >
            <span className="manual-player-name">
              {player.name} ({player.sex})
            </span>
          </List.Item>
        )}
      />
    </Card>
  );

  const renderTeamsCard = () => (
    <Card
      title={<span className="manual-card-title">Times</span>}
      className="manual-card"
    >
      <div className="manual-teams-list">
        {Object.entries(teams).map(([idx, playerIds]) => {
          const teamIndex = Number(idx);

          return (
            <Card
              key={idx}
              type="inner"
              title={
                <span className="manual-card-title">
                  {teamNames[teamIndex]?.trim() || `Time ${idx}`}
                </span>
              }
              className="manual-inner-card"
            >
              <Input
                placeholder="Nome do time"
                value={teamNames[teamIndex]}
                onChange={e =>
                  setTeamNames(prev => ({
                    ...prev,
                    [teamIndex]: e.target.value,
                  }))
                }
                className="manual-team-name-input"
              />

              <List
                className="manual-list manual-team-player-list"
                dataSource={playerIds}
                locale={{
                  emptyText: (
                    <Empty
                      description="Nenhum jogador"
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                    />
                  ),
                }}
                renderItem={playerId => {
                  const player = players.find(p => p.id === playerId);

                  return (
                    <List.Item
                      className="manual-list-item"
                      actions={[
                        <Button
                          size="small"
                          danger
                          onClick={() =>
                            removePlayerFromTeam(teamIndex, playerId)
                          }
                        >
                          Remover
                        </Button>,
                      ]}
                    >
                      <span className="manual-player-name">
                        {player?.name} ({player?.sex})
                      </span>
                    </List.Item>
                  );
                }}
              />

              <Text className="manual-vacancies">
                {playersPerTeam - playerIds.length} vagas restantes
              </Text>
            </Card>
          );
        })}
      </div>
    </Card>
  );

  if (playersLoading) {
    return <div className="manual-loading">Carregando jogadores...</div>;
  }

  return (
    <div className="manual-page">
      <div className="manual-header">
        <Title level={2} className="manual-title">
          Criação de Campeonato
        </Title>

        <div className="manual-header-counter">
          {totalSelected}/{needed} selecionados
        </div>
      </div>

      {isMobile ? (
        <>
          <Tabs
            className="manual-mobile-tabs"
            defaultActiveKey="config"
            items={[
              {
                key: 'config',
                label: 'Config.',
                children: renderConfigCard(),
              },
              {
                key: 'players',
                label: 'Jogadores',
                children: renderPlayersCard(),
              },
              {
                key: 'teams',
                label: 'Times',
                children: renderTeamsCard(),
              },
            ]}
          />

          <div className="manual-mobile-create-bar">
            <div>
              <strong>{totalSelected}</strong> de <strong>{needed}</strong>{' '}
              jogadores
            </div>

            <Button
              type="primary"
              onClick={handleOpenModal}
              disabled={!isComplete}
              className="manual-primary-button"
            >
              Criar
            </Button>
          </div>
        </>
      ) : (
        <Row gutter={[16, 16]} className="manual-desktop-row">
          <Col xs={24} md={8} className="manual-column">
            {renderConfigCard()}
          </Col>

          <Col xs={24} md={8} className="manual-column">
            {renderPlayersCard()}
          </Col>

          <Col xs={24} md={8} className="manual-column">
            {renderTeamsCard()}
          </Col>
        </Row>
      )}

      <Modal
        title={<span className="manual-card-title">Configurar Campeonato</span>}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={isMobile ? 'calc(100vw - 24px)' : 600}
        style={{ top: isMobile ? 8 : 20 }}
        className="manual-modal"
        closeIcon={<CloseOutlined className="manual-modal-close" />}
        styles={{
          body: {
            maxHeight: isMobile
              ? 'calc(100dvh - 150px)'
              : 'calc(100vh - 160px)',
            overflowY: 'auto',
          },
        }}
      >
        <Form layout="vertical" className="manual-form">
          <Form.Item label="Nome do Campeonato" required>
            <Input
              value={championshipName}
              onChange={e => setChampionshipName(e.target.value)}
            />
          </Form.Item>

          <Form.Item label="Formato" required>
            <Select
              value={championshipFormat}
              onChange={value => setChampionshipFormat(value)}
              options={[
                {
                  value: 'GROUPS',
                  label: 'Fase de Grupos + Eliminatórias',
                },
                {
                  value: 'KNOCKOUT',
                  label: 'Eliminatórias Diretas',
                },
              ]}
            />
          </Form.Item>

          {!isKnockout && (
            <>
              <Form.Item label="Número de Grupos" required>
                <InputNumber
                  min={1}
                  value={groupsCount}
                  onChange={value => setGroupsCount(Number(value) || 1)}
                  className="manual-full-width"
                />
              </Form.Item>

              <Form.Item label="Alocar Times aos Grupos">
                <div className="manual-group-list">
                  {Array.from({ length: teamCount }, (_, i) => i + 1).map(
                    teamIdx => (
                      <div key={teamIdx} className="manual-group-row">
                        <span>
                          {teamNames[teamIdx]?.trim() || `Time ${teamIdx}`}
                        </span>

                        <Select
                          value={teamGroups[teamIdx]}
                          onChange={value =>
                            setTeamGroups(prev => ({
                              ...prev,
                              [teamIdx]: value,
                            }))
                          }
                          className="manual-group-select"
                          options={Array.from(
                            { length: groupsCount },
                            (_, g) => ({
                              value: g + 1,
                              label: `Grupo ${g + 1}`,
                            })
                          )}
                        />
                      </div>
                    )
                  )}
                </div>
              </Form.Item>

              <Form.Item label="Classificados por grupo" required>
                <InputNumber
                  min={1}
                  value={qualifiedPerGroup}
                  onChange={value =>
                    setQualifiedPerGroup(Number(value) || 1)
                  }
                  className="manual-full-width"
                />
              </Form.Item>
            </>
          )}

          <Form.Item label="Tipo de Partidas" required>
            <Radio.Group
              value={matchesType}
              onChange={e => setMatchesType(e.target.value)}
              className="manual-radio-group"
            >
              <Radio value="SINGLE">Somente Ida</Radio>
              <Radio value="HOME_AND_AWAY">Ida e Volta</Radio>
            </Radio.Group>
          </Form.Item>

          <Card
            title="Configuração de Sets"
            size="small"
            className="manual-inner-card manual-sets-card"
          >
            <Form.Item label="Sets para vencer">
              <Select
                value={setsToWin}
                onChange={value => setSetsToWin(value)}
                options={[
                  { value: 1, label: 'Melhor de 1 set' },
                  { value: 2, label: 'Melhor de 3 sets' },
                  { value: 3, label: 'Melhor de 5 sets' },
                ]}
              />
            </Form.Item>

            <Form.Item label="Pontos por set">
              <InputNumber
                min={10}
                max={30}
                value={pointsPerSet}
                onChange={value => setPointsPerSet(Number(value) || 25)}
                className="manual-full-width"
              />
            </Form.Item>

            {setsToWin > 1 && (
              <Form.Item label="Pontos no tie-break">
                <InputNumber
                  min={10}
                  max={25}
                  value={tieBreakPoints}
                  onChange={value => setTieBreakPoints(Number(value) || 15)}
                  className="manual-full-width"
                />
              </Form.Item>
            )}
          </Card>

          <Form.Item>
            <Button
              type="primary"
              onClick={handleSaveChampionship}
              loading={isSaving}
              block
              className="manual-primary-button"
            >
              Criar Campeonato
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};