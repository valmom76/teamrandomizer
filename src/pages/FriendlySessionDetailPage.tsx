import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, Button, Select, Row, Col, Typography, Spin } from 'antd';
import { http } from '../api/http';
import { ScoreboardModal } from '../components/championship/ScoreboardModal';

export default function FriendlySessionDetailPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [details, setDetails] = useState<any>(null);
  const [showScoreboard, setShowScoreboard] = useState(false);
  const [selectedHome, setSelectedHome] = useState<number | null>(null);
  const [selectedAway, setSelectedAway] = useState<number | null>(null);
  const [currentCourt, setCurrentCourt] = useState<string>('');

  useEffect(() => {
    http.get(`/game-sessions/${sessionId}/details`).then(res => setDetails(res.data));
  }, [sessionId]);

  const openScoreboard = (courtName: string, homeTeam: number, awayTeam: number) => {
    setCurrentCourt(courtName);
    setSelectedHome(homeTeam);
    setSelectedAway(awayTeam);
    setShowScoreboard(true);
  };

  const handleSaveFriendly = async (matchData: any) => {
    await http.post(`/game-sessions/${sessionId}/matches`, {
      courtName: currentCourt,
      homeTeamIndex: selectedHome,
      awayTeamIndex: selectedAway,
      homeScore: matchData.homeScore,
      awayScore: matchData.awayScore,
      walkover: matchData.walkover || false,
      winnerTeamIndex: matchData.winnerTeamIndex,
    });
    const res = await http.get(`/game-sessions/${sessionId}/details`);
    setDetails(res.data);
  };

  if (!details) return <Spin />;

  return (
    <div style={{ padding: 24 }}>
      <Typography.Title level={2} style={{ color: '#01ff69' }}>
        Vôlei de Terça - {details.dateFormatted}
      </Typography.Title>
      {details.courts.map((court: any) => (
        <Card
          key={court.name}
          title={<span style={{ color: '#01ff69', fontSize: 24 }}>{court.name}</span>}
          style={{ backgroundColor: '#1a1a1a', borderColor: '#333', marginBottom: 24 }}
        >
          <Row gutter={[16, 16]}>
            {court.teams.map((team: any) => (
              <Col span={12} key={team.teamIndex}>
                <Card
                  size="small"
                  style={{ backgroundColor: '#262626', borderColor: '#444' }}
                  title={team.teamName}
                >
                  {team.playerNames.join(', ')}
                  <br />
                  Rating: {team.avgRating.toFixed(1)} | Women: {team.womenCount}
                </Card>
              </Col>
            ))}
          </Row>
          <div style={{ marginTop: 16, display: 'flex', gap: 8, justifyContent: 'center' }}>
            <Select
              placeholder="Home team"
              style={{ width: 200 }}
              onChange={(val) => setSelectedHome(Number(val))}
              value={selectedHome}
              options={court.teams.map((t: any) => ({ value: t.teamIndex, label: t.teamName }))}
            />
            <Select
              placeholder="Away team"
              style={{ width: 200 }}
              onChange={(val) => setSelectedAway(Number(val))}
              value={selectedAway}
              options={court.teams.map((t: any) => ({ value: t.teamIndex, label: t.teamName }))}
            />
            <Button
              type="primary"
              disabled={!selectedHome || !selectedAway || selectedHome === selectedAway}
              onClick={() => openScoreboard(court.name, selectedHome!, selectedAway!)}
            >
              Start Match
            </Button>
          </div>
        </Card>
      ))}
      {showScoreboard && selectedHome && selectedAway && (
        <ScoreboardModal
          visible={showScoreboard}
          onClose={() => setShowScoreboard(false)}
          championshipId=""
          matchId=""
          homeTeamIndex={selectedHome}
          awayTeamIndex={selectedAway}
          generationSessionId={sessionId}
          onSave={handleSaveFriendly}
          onSuccess={() => setShowScoreboard(false)}
        />
      )}
    </div>
  );
}