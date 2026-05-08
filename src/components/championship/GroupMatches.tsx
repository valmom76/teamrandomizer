import React, { useState } from 'react';
import { Card, Button, message } from 'antd';
import type { MatchDetails } from '../types';
import { ScoreboardModal } from './ScoreboardModal';

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
    cardTitle: { fontSize: 28, color: '#2bd96b' },
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
    winner: { fontSize: '28px', color: '#2bd96b', fontWeight: 'bold' },
    matchScore: { fontSize: '32px', fontWeight: 'bold', color: '#fff' },
    playButton: { fontSize: '20px', height: 'auto', padding: '8px 24px', color: '#000' },
  };

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
            <Button size="large" type="primary" onClick={() => handlePlay(match)} style={styles.playButton}>
              Jogar
            </Button>
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
          homeTeamName={selectedMatch.homeTeamName}   // ← ADICIONE
          awayTeamName={selectedMatch.awayTeamName}   // ← ADICIONE
          onSuccess={() => onMatchPlayed && onMatchPlayed()}
        />
      )}
    </Card>
  );
};