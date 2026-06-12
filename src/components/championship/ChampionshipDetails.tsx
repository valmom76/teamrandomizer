import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Tabs, Button, Spin, Alert, message, Card } from 'antd';
import { useChampionships } from '../../hooks/useChampionships';
import { GroupStandings } from '../../components/championship/GroupStandings';
import { GroupMatches } from '../../components/championship/GroupMatches';
import { KnockoutBracket } from '../../components/championship/KnockoutBracket';

const ChampionshipDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { useDetails, generateNextStage, isGeneratingNext, generateThirdPlace, isGeneratingThirdPlace } = useChampionships(id);
  const { data, isLoading, error, refetch } = useDetails();

  const [activeTab, setActiveTab] = useState('groups');

  if (isLoading) return <Spin />;
  if (error) return <Alert message="Erro ao carregar detalhes" type="error" />;
  if (!data) return null;

  const { championship, standingsByGroup, matchesByGroup, knockoutMatches } = data;

  const isGroupStageComplete = () => {
    const groups = Object.keys(matchesByGroup);
    return groups.length > 0 && groups.every(g => matchesByGroup[parseInt(g)].every(m => m.played));
  };

  const handleNextStage = async () => {
    try {
      await generateNextStage();
      await refetch();
      message.success('Próxima fase gerada');
    } catch (err) {
      message.error('Erro ao gerar próxima fase');
    }
  };

  const handleThirdPlace = async () => {
    try {
      await generateThirdPlace();
      await refetch();
      message.success('Disputa de 3º lugar gerada');
    } catch (err) {
      message.error('Erro ao gerar 3º lugar');
    }
  };

  // Renderiza grupos com grid de 2 colunas e destaca classificados
  const renderGroups = () => {
    const groups = Object.entries(standingsByGroup);
    if (groups.length === 0) {
      return (
        <Card>
          <p>Nenhuma partida foi jogada ainda. A classificação será atualizada após os primeiros resultados.</p>
        </Card>
      );
    }
    const qualifiedCount = championship.qualifiedPerGroup ?? 0; // valor padrão 0
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
        {groups.map(([groupIdx, standings]) => {
          const groupIndex = parseInt(groupIdx);
          const groupMatches = matchesByGroup[groupIndex] || [];
          const isGroupComplete = groupMatches.length > 0 && groupMatches.every(m => m.played);
          return (
            <GroupStandings
              key={groupIdx}
              standings={standings}
              groupName={`Grupo ${groupIdx}`}
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
            groupName={`Grupo ${groupIdx}`}
            onMatchPlayed={refetch}
          />
        ))}
      </div>
    );
  };

  const tabItems = [
    {
      key: 'groups',
      label: 'Grupos',
      children: renderGroups(),
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
          {knockoutMatches.length > 0 && (
            <>
              <KnockoutBracket matches={knockoutMatches} championshipId={id!} onMatchPlayed={refetch} />
              {knockoutMatches.some(m => m.stage === 'SEMI' && m.played) && !knockoutMatches.some(m => m.stage === 'THIRD_PLACE') && (
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
      <h1 style={{ fontSize: 48, color: '#01ff69' }}>{championship.name}</h1>
      <p style={{ fontSize: 24 }}>Status: {championship.status}</p>
      <Tabs activeKey={activeTab} items={tabItems} onChange={setActiveTab} />
    </div>
  );
};

export default ChampionshipDetailsPage;