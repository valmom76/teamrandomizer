import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Tabs, Button, Spin, Alert, message, Card, Modal } from 'antd';
import { CloseOutlined, FullscreenOutlined } from '@ant-design/icons';
import { useChampionships } from '../hooks/useChampionships';
import { GroupStandings } from '../components/championship/GroupStandings';
import { GroupMatches } from '../components/championship/GroupMatches';
import { KnockoutBracket } from '../components/championship/KnockoutBracket';

const getGroupLetter = (index: number): string => {
  return String.fromCharCode(64 + index);
};

const ChampionshipDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const {
    useDetails,
    generateNextStage,
    isGeneratingNext,
    generateThirdPlace,
    isGeneratingThirdPlace,
  } = useChampionships(id);

  const { data, isLoading, error, refetch } = useDetails();

  const [activeTab, setActiveTab] = useState('groups');
  const [fullscreenGroups, setFullscreenGroups] = useState(false);

  const refetchTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (refetchTimeoutRef.current !== null) {
        clearTimeout(refetchTimeoutRef.current);
      }
    };
  }, []);

  if (isLoading) return <Spin />;
  if (error) return <Alert message="Erro ao carregar detalhes" type="error" />;
  if (!data) return null;

  const { championship, standingsByGroup, matchesByGroup, knockoutMatches } = data;
  const isKnockoutFormat = championship.format === 'KNOCKOUT';

  // Se for KNOCKOUT, já inicia na aba Mata-Mata
  if (isKnockoutFormat && activeTab === 'groups') {
    setActiveTab('knockout');
  }

  const isGroupStageComplete = () => {
    const groups = Object.keys(matchesByGroup);
    return groups.length > 0 && groups.every((g) => matchesByGroup[parseInt(g)].every((m) => m.played));
  };

  const handleNextStage = async () => {
    try {
      await generateNextStage();
      await refetch();
      message.success('Próxima fase gerada');
    } catch {
      message.error('Erro ao gerar próxima fase');
    }
  };

  const handleThirdPlace = async () => {
    try {
      await generateThirdPlace();
      await refetch();
      message.success('Disputa de 3º lugar gerada');
    } catch {
      message.error('Erro ao gerar 3º lugar');
    }
  };

  const getCurrentKnockoutStage = () => {
    if (knockoutMatches.length === 0) return null;
    if (knockoutMatches.some((m) => m.stage === 'QUARTER')) return 'QUARTER';
    if (knockoutMatches.some((m) => m.stage === 'SEMI')) return 'SEMI';
    if (knockoutMatches.some((m) => m.stage === 'FINAL')) return 'FINAL';
    return null;
  };

  const isCurrentStageComplete = () => {
    const stage = getCurrentKnockoutStage();
    if (!stage) return false;
    const stageMatches = knockoutMatches.filter((m) => m.stage === stage);
    return stageMatches.length > 0 && stageMatches.every((m) => m.played);
  };

  const canGenerateNextStage = () => {
    if (knockoutMatches.length === 0) return false;
    const currentStage = getCurrentKnockoutStage();
    if (currentStage === 'FINAL') return false;
    return isCurrentStageComplete();
  };

  const getNextStageButtonText = () => {
    const currentStage = getCurrentKnockoutStage();
    if (currentStage === 'QUARTER') return 'Gerar Semifinais';
    if (currentStage === 'SEMI') return 'Gerar Final';
    return 'Gerar Próxima Fase';
  };

  const renderGroupsGrid = () => {
    const groups = Object.entries(standingsByGroup);
    const qualifiedCount = championship.qualifiedPerGroup ?? 0;

    if (groups.length === 0) {
      return (
        <Card>
          <p>Nenhum grupo encontrado. Os times ainda não foram distribuídos.</p>
        </Card>
      );
    }

    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
        {groups.map(([groupIdx, standings]) => {
          const groupIndex = parseInt(groupIdx);
          const groupMatches = matchesByGroup[groupIndex] || [];
          const isGroupComplete = groupMatches.length > 0 && groupMatches.every((m) => m.played);
          return (
            <GroupStandings
              key={groupIdx}
              standings={standings}
              groupName={`Grupo ${getGroupLetter(groupIndex)}`}
              qualifiedCount={qualifiedCount}
              isGroupComplete={isGroupComplete}
            />
          );
        })}
      </div>
    );
  };

  const renderMatches = () => {
    const groups = Object.entries(matchesByGroup);
    if (groups.length === 0) {
      return (
        <Card>
          <p>Nenhuma partida disponível.</p>
        </Card>
      );
    }
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
        {groups.map(([groupIdx, matches]) => (
          <GroupMatches
            key={groupIdx}
            matches={matches}
            championshipId={id!}
            groupName={`Grupo ${getGroupLetter(parseInt(groupIdx))}`}
            onMatchPlayed={refetch}
          />
        ))}
      </div>
    );
  };

  // Abas dinâmicas: se for KNOCKOUT, não mostra Grupos nem Partidas
  const tabItems = isKnockoutFormat
    ? [
        {
          key: 'knockout',
          label: 'Mata-Mata',
          children: (
            <>
              {knockoutMatches.length > 0 && canGenerateNextStage() && championship.status !== 'FINISHED' && (
                <Button onClick={handleNextStage} loading={isGeneratingNext} style={{ marginBottom: 16 }}>
                  {getNextStageButtonText()}
                </Button>
              )}
              {knockoutMatches.length > 0 && (
                <>
                  <KnockoutBracket
                    matches={knockoutMatches}
                    championshipId={id!}
                    onMatchPlayed={refetch}
                  />
                  {knockoutMatches.some((m) => m.stage === 'SEMI' && m.played) &&
                    !knockoutMatches.some((m) => m.stage === 'THIRD_PLACE') && (
                      <Button onClick={handleThirdPlace} loading={isGeneratingThirdPlace} style={{ marginTop: 16 }}>
                        Gerar Disputa de 3º Lugar
                      </Button>
                    )}
                </>
              )}
              {knockoutMatches.length === 0 && (
                <Card>
                  <p>Nenhuma partida eliminatória encontrada. Verifique se o campeonato foi configurado corretamente.</p>
                </Card>
              )}
            </>
          ),
        },
      ]
    : [
        {
          key: 'groups',
          label: 'Grupos',
          children: renderGroupsGrid(),
        },
        {
          key: 'matches',
          label: 'Partidas',
          children: renderMatches(),
        },
        {
          key: 'knockout',
          label: 'Mata-Mata',
          children: (
            <>
              {knockoutMatches.length === 0 && isGroupStageComplete() && (
                <Button onClick={handleNextStage} loading={isGeneratingNext} style={{ marginBottom: 16 }}>
                  Gerar Fase Eliminatória
                </Button>
              )}
              {knockoutMatches.length > 0 && canGenerateNextStage() && championship.status !== 'FINISHED' && (
                <Button onClick={handleNextStage} loading={isGeneratingNext} style={{ marginBottom: 16 }}>
                  {getNextStageButtonText()}
                </Button>
              )}
              {knockoutMatches.length > 0 && (
                <>
                  <KnockoutBracket
                    matches={knockoutMatches}
                    championshipId={id!}
                    onMatchPlayed={refetch}
                  />
                  {knockoutMatches.some((m) => m.stage === 'SEMI' && m.played) &&
                    !knockoutMatches.some((m) => m.stage === 'THIRD_PLACE') && (
                      <Button onClick={handleThirdPlace} loading={isGeneratingThirdPlace} style={{ marginTop: 16 }}>
                        Gerar Disputa de 3º Lugar
                      </Button>
                    )}
                </>
              )}
            </>
          ),
        },
      ];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ fontSize: 48, color: '#01ff69', margin: 0 }}>{championship.name}</h1>
        {!isKnockoutFormat && (
          <Button
            icon={<FullscreenOutlined />}
            onClick={() => setFullscreenGroups(true)}
            style={{ fontSize: 20, padding: '20px 30px' }}
          >
            Tela Cheia
          </Button>
        )}
      </div>

      <Tabs activeKey={activeTab} items={tabItems} onChange={setActiveTab} />

      {/* Modal de tela cheia (apenas para formato com grupos) */}
      {!isKnockoutFormat && (
        <Modal
          title={
            <div style={{ fontSize: '32px', fontWeight: 700, textAlign: 'center', color: '#4CAF50', width: '100%', paddingBottom: 8 }}>
              Classificação
            </div>
          }
          open={fullscreenGroups}
          onCancel={() => setFullscreenGroups(false)}
          footer={null}
          width="100vw"
          style={{ top: 0, maxWidth: '100vw', height: '100vh', padding: 0, overflow: 'hidden' }}
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
          {renderGroupsGrid()}
        </Modal>
      )}
    </div>
  );
};

export default ChampionshipDetailsPage;