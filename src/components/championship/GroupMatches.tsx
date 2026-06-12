import React, { useState } from 'react';
import { Card, Button, message } from 'antd';
import type { MatchDetails } from '../types';
import { ScoreboardModal } from './ScoreboardModal';
import { PlayCircleOutlined } from '@ant-design/icons';
import styled from 'styled-components';

interface Props {
  matches: MatchDetails[];
  championshipId: string;
  groupName: string;
  onMatchPlayed?: () => void;
}

export const GroupMatches: React.FC<Props> = ({ matches, championshipId, groupName, onMatchPlayed }) => {
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

  const styles = {
    card: { marginBottom: 16, backgroundColor: '#1a1a1a', border: '1px solid #333' },
    cardTitle: { fontSize: 28, color: '#01ff69' },
    matchRow: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px 12px',
      borderBottom: '1px solid #333',
      fontSize: '24px',
    },
    matchRound: { width: 120, fontSize: '20px', color: '#aaa' },
    matchTeams: { flex: 1, display: 'flex', justifyContent: 'center', gap: '20px', alignItems: 'center' },
    team: { fontSize: '28px', color: '#fff' },
    winner: { fontSize: '28px', color: '#01ff69', fontWeight: 'bold' },
    matchScore: { fontSize: '32px', fontWeight: 'bold', color: '#fff' },
    playButton: { fontSize: '20px', height: 'auto', padding: '8px 24px', color: '#000' },
  };

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
  return (
    <Card title={groupName} style={styles.card} styles={{ header: styles.cardTitle }}>
      {matches.map((match) => (
        <div key={match.matchId} style={styles.matchRow}>
          <div style={styles.matchRound}>Rodada {match.round}</div>
          <div style={styles.matchTeams}>
            <span style={match.played && match.winnerTeamIndex === match.homeTeamIndex ? styles.winner : styles.team}>
              {match.homeTeamName || `Time ${match.homeTeamIndex}`}
            </span>
            <span style={styles.matchScore}>
              {match.played ? `${match.homeScore} x ${match.awayScore}` : 'vs'}
            </span>
            <span style={match.played && match.winnerTeamIndex === match.awayTeamIndex ? styles.winner : styles.team}>
              {match.awayTeamName || `Time ${match.awayTeamIndex}`}
            </span>
          </div>
          {!match.played && (
            <PlayButton
              icon={<PlayCircleOutlined style={{ fontSize: 28, marginRight: 8 }} />}
              onClick={() => handlePlay(match)}
            >
              Iniciar Jogo
            </PlayButton>
          )}
        </div>
      ))}
      {selectedMatch && (
        <ScoreboardModal
          visible={modalVisible}
          onClose={() => { setModalVisible(false); setSelectedMatch(null); }}
          championshipId={championshipId}
          matchId={selectedMatch.matchId}
          homeTeamIndex={selectedMatch.homeTeamIndex}
          awayTeamIndex={selectedMatch.awayTeamIndex}
          generationSessionId={selectedMatch.generationSessionId}
          homeTeamName={selectedMatch.homeTeamName}
          awayTeamName={selectedMatch.awayTeamName}
          onSuccess={() => onMatchPlayed && onMatchPlayed()}
        />
      )}
    </Card>
  );
};