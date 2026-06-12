import React, { useState } from 'react';
import { Card, Button, Tag, message } from 'antd';
import { PlayCircleOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import type { MatchDetails } from '../types';
import { ScoreboardModal } from './ScoreboardModal';

interface Props {
  matches: MatchDetails[];
  championshipId: string;
  onMatchPlayed?: () => void;
}

// Estilos customizados com styled-components para maior controle
const StyledCard = styled(Card)`
  background-color: #1a1a1a !important;
  border: 1px solid #333 !important;
  margin-bottom: 24px;
  .ant-card-head {
    background-color: #0d0d0d;
    border-bottom: 1px solid #01ff69;
  }
  .ant-card-head-title {
    font-size: 36px;
    font-weight: bold;
    color: #01ff69;
  }
`;

const MatchContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: #262626;
  padding: 20px 24px;
  margin-bottom: 16px;
  border-radius: 8px;
  border-left: 6px solid #01ff69;
`;

const TeamsDisplay = styled.div`
  font-size: 32px;
  font-weight: 600;
  color: #ffffff;
  span {
    color: #01ff69;
    margin: 0 12px;
  }
`;

const ScoreDisplay = styled(Tag)`
  font-size: 28px !important;
  padding: 12px 24px !important;
  border-radius: 8px;
  background-color: #01ff69 !important;
  color: #1a1a1a !important;
  border: none;
  font-weight: bold;
`;

const PlayButton = styled(Button)`
  font-size: 24px !important;
  padding: 12px 30px !important;
  height: auto !important;
  background-color: #01ff69 !important;
  border-color: #01ff69 !important;
  color: #1a1a1a !important;
  font-weight: bold;
  &:hover {
    background-color: #1faa4e !important;
    border-color: #1faa4e !important;
  }
`;

const stageOrder = ['QUARTER', 'SEMI', 'FINAL', 'THIRD_PLACE'];
const stageNames: Record<string, string> = {
  QUARTER: 'Quartas de Final',
  SEMI: 'Semifinal',
  FINAL: 'Final',
  THIRD_PLACE: 'Disputa de 3º Lugar',
};

export const KnockoutBracket: React.FC<Props> = ({ matches, championshipId, onMatchPlayed }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<MatchDetails | null>(null);

  const handlePlay = (match: MatchDetails) => {
    if (!match.generationSessionId) {
      message.error('Dados da partida incompletos. Não é possível iniciar o jogo.');
      return;
    }
    setSelectedMatch(match);
    setModalVisible(true);
  };

  const grouped = matches.reduce((acc, match) => {
    const stage = match.stage || 'UNKNOWN';
    if (!acc[stage]) acc[stage] = [];
    acc[stage].push(match);
    return acc;
  }, {} as Record<string, MatchDetails[]>);

  return (
    <div>
      {stageOrder.map(stage => {
        const stageMatches = grouped[stage];
        if (!stageMatches || stageMatches.length === 0) return null;

        return (
          <StyledCard key={stage} title={stageNames[stage]}>
            {stageMatches.map(match => (
              <MatchContainer key={match.matchId}>
                <TeamsDisplay>
                  {match.homeTeamName || `Time ${match.homeTeamIndex}`} <span>vs</span> {match.awayTeamName || `Time ${match.awayTeamIndex}`}
                </TeamsDisplay>
                <div>
                  {match.played ? (
                    <ScoreDisplay>
                      {match.homeScore} x {match.awayScore}
                    </ScoreDisplay>
                  ) : (
                    <PlayButton
                      icon={<PlayCircleOutlined style={{ fontSize: 28, marginRight: 8 }} />}
                      onClick={() => handlePlay(match)}
                    >
                      Iniciar Jogo
                    </PlayButton>
                  )}
                </div>
              </MatchContainer>
            ))}
          </StyledCard>
        );
      })}

      {selectedMatch && (
        <ScoreboardModal
          visible={modalVisible}
          onClose={() => {
            setModalVisible(false);
            setSelectedMatch(null);
          }}
          championshipId={championshipId}
          matchId={selectedMatch.matchId}
          homeTeamIndex={selectedMatch.homeTeamIndex}
          awayTeamIndex={selectedMatch.awayTeamIndex}
          generationSessionId={selectedMatch.generationSessionId}
          onSuccess={() => {
            if (onMatchPlayed) onMatchPlayed();
          }}
          homeTeamName={selectedMatch.homeTeamName}
          awayTeamName={selectedMatch.awayTeamName}
        />
      )}
    </div>
  );
};