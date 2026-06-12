import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  Button,
  InputNumber,
  Input,
  Form,
  Select,
  Spin,
  message,
} from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import * as htmlToImage from 'html-to-image';

import { http } from '../../api/http';
import {
  CourtPosterImage,
  type TeamPlayer,
  type PosterTeam,
} from '../CourtPosterImage/CourtPosterImage';

interface TeamInfo {
  teamIndex: number;
  teamName: string;
  avgRating: number;
  womenCount: number;
}

interface CourtAllocation {
  name: string;
  teams: TeamInfo[];
}

interface DistributionSuggestion {
  courts: CourtAllocation[];
}

interface GeneratedTeam {
  teamIndex: number;
  name?: string;
  players: TeamPlayer[];
}

interface CourtSetupModalProps {
  open: boolean;
  sessionId: string;
  teams: GeneratedTeam[];
  onCancel: () => void;
  onConfirm: (courts: { name: string; teamIndices: number[] }[]) => void;
}

export const CourtSetupModal: React.FC<CourtSetupModalProps> = ({
  open,
  sessionId,
  teams,
  onCancel,
  onConfirm,
}) => {
  const posterRefs = useRef<(HTMLDivElement | null)[]>([]);

  const [loadingSuggestion, setLoadingSuggestion] = useState(false);
  const [courtCount, setCourtCount] = useState(1);
  const [courtNames, setCourtNames] = useState<string[]>(['Quadra 1']);
  const [suggestion, setSuggestion] = useState<DistributionSuggestion | null>(null);
  const [assignments, setAssignments] = useState<Record<number, number>>({});

  useEffect(() => {
    if (!open || !sessionId) return;
    fetchSuggestion();
  }, [open, sessionId, courtCount]);

  const fetchSuggestion = async () => {
    if (!sessionId) return;

    setLoadingSuggestion(true);

    try {
      const res = await http.post('/teams/suggest-distribution', {
        sessionId,
        courtCount,
        courtNames: courtNames.slice(0, courtCount),
      });

      const data: DistributionSuggestion = res.data;
      setSuggestion(data);

      const initialAssignments: Record<number, number> = {};

      data.courts.forEach((court, courtIndex) => {
        court.teams.forEach((team) => {
          initialAssignments[team.teamIndex] = courtIndex;
        });
      });

      setAssignments(initialAssignments);
    } catch (err: any) {
      message.error(
        err?.response?.data?.message || 'Falha ao carregar sugestão de distribuição'
      );
    } finally {
      setLoadingSuggestion(false);
    }
  };

  const teamsInfoMap = useMemo(() => {
    const map = new Map<number, TeamInfo>();

    suggestion?.courts.forEach((court) => {
      court.teams.forEach((team) => {
        map.set(team.teamIndex, team);
      });
    });

    return map;
  }, [suggestion]);

  const availableTeams = useMemo(() => {
    return teams
      .map((team) => {
        const suggestionInfo = teamsInfoMap.get(team.teamIndex);

        return {
          teamIndex: team.teamIndex,
          name: team.name || suggestionInfo?.teamName || `Time ${team.teamIndex + 1}`,
          players: team.players || [],
          avgRating: suggestionInfo?.avgRating,
          womenCount: suggestionInfo?.womenCount,
        };
      })
      .sort((a, b) => a.teamIndex - b.teamIndex);
  }, [teams, teamsInfoMap]);

  const allocatedCourts = useMemo(() => {
    return Array.from({ length: courtCount }, (_, courtIndex) => {
      const name = courtNames[courtIndex] || `Quadra ${courtIndex + 1}`;

      const courtTeams: PosterTeam[] = availableTeams
        .filter((team) => assignments[team.teamIndex] === courtIndex)
        .sort((a, b) => a.teamIndex - b.teamIndex)
        .map((team) => ({
          teamIndex: team.teamIndex,
          name: team.name,
          players: team.players,
        }));

      return {
        name,
        teams: courtTeams,
      };
    });
  }, [courtCount, courtNames, availableTeams, assignments]);

  const handleCourtCountChange = (value: number | null) => {
    const count = value || 1;

    setCourtCount(count);

    setCourtNames((prev) => {
      const updated = [...prev];

      while (updated.length < count) {
        updated.push(`Quadra ${updated.length + 1}`);
      }

      return updated.slice(0, count);
    });
  };

  const handleCourtNameChange = (index: number, name: string) => {
    setCourtNames((prev) => {
      const updated = [...prev];
      updated[index] = name;
      return updated;
    });
  };

  const handleAssignTeam = (teamIndex: number, courtIndex: number) => {
    setAssignments((prev) => ({
      ...prev,
      [teamIndex]: courtIndex,
    }));
  };

  const sanitizeFileName = (value: string) =>
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase();

  const handleExportImages = async () => {
    try {
      for (let i = 0; i < allocatedCourts.length; i++) {
        const node = posterRefs.current[i];
        const court = allocatedCourts[i];

        if (!node) continue;

        const dataUrl = await htmlToImage.toPng(node, {
          cacheBust: true,
          pixelRatio: 2,
          backgroundColor: '#020402',
        });

        const link = document.createElement('a');
        link.download = `${sanitizeFileName(court.name)}.png`;
        link.href = dataUrl;
        link.click();

        await new Promise((resolve) => setTimeout(resolve, 250));
      }

      message.success('Imagens exportadas com sucesso');
    } catch (error) {
      console.error(error);
      message.error('Não foi possível exportar as imagens');
    }
  };

  const handleConfirm = () => {
    const courts: { name: string; teamIndices: number[] }[] = [];

    for (let i = 0; i < courtCount; i++) {
      const name = courtNames[i] || `Quadra ${i + 1}`;
      const teamIndices: number[] = [];

      Object.entries(assignments).forEach(([teamIndexStr, courtIdx]) => {
        if (courtIdx === i) {
          teamIndices.push(Number(teamIndexStr));
        }
      });

      courts.push({
        name,
        teamIndices,
      });
    }

    onConfirm(courts);
  };

  return (
    <>
      <Modal
        title={<span style={{ color: '#01ff69' }}>Configurar Quadras</span>}
        open={open}
        onCancel={onCancel}
        footer={[
          <Button key="cancel" onClick={onCancel}>
            Cancelar
          </Button>,
          <Button
            key="export"
            onClick={handleExportImages}
            disabled={loadingSuggestion || allocatedCourts.length === 0}
          >
            Exportar Imagens
          </Button>,
          <Button
            key="submit"
            type="primary"
            onClick={handleConfirm}
            loading={loadingSuggestion}
          >
            Iniciar Sessão
          </Button>,
        ]}
        width={720}
        style={{ top: 20 }}
        closeIcon={<CloseOutlined style={{ color: '#01ff69' }} />}
      >
        <Form layout="vertical">
          <Form.Item label="Número de quadras">
            <InputNumber
              min={1}
              max={Math.max(1, teams.length)}
              value={courtCount}
              onChange={handleCourtCountChange}
            />
          </Form.Item>

          {Array.from({ length: courtCount }).map((_, idx) => (
            <Form.Item key={idx} label={`Nome da ${idx + 1}ª Quadra`}>
              <Input
                value={courtNames[idx]}
                onChange={(e) => handleCourtNameChange(idx, e.target.value)}
                placeholder={`Quadra ${idx + 1}`}
              />
            </Form.Item>
          ))}

          {loadingSuggestion ? (
            <div style={{ textAlign: 'center', padding: 20 }}>
              <Spin />
            </div>
          ) : (
            <Form.Item label="Alocar Times para Quadras">
              {availableTeams.map((team) => (
                <div
                  key={team.teamIndex}
                  style={{
                    marginBottom: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                  }}
                >
                  <span style={{ flex: 1, color: '#fff' }}>
                    {team.name}{' '}
                    <span style={{ fontSize: 12, color: '#aaa' }}>
                      ({team.avgRating?.toFixed(1) ?? '-'} | Mulheres:{' '}
                      {team.womenCount ?? '-'})
                    </span>
                  </span>

                  <Select
                    value={assignments[team.teamIndex] ?? 0}
                    onChange={(val) => handleAssignTeam(team.teamIndex, val)}
                    style={{ width: 220 }}
                    options={Array.from({ length: courtCount }, (_, i) => ({
                      value: i,
                      label: courtNames[i] || `Quadra ${i + 1}`,
                    }))}
                  />
                </div>
              ))}
            </Form.Item>
          )}
        </Form>
      </Modal>

      <div className="export-hidden-area">
        {allocatedCourts.map((court, index) => (
          <CourtPosterImage
            key={`${court.name}-${index}`}
            ref={(el) => {
              posterRefs.current[index] = el;
            }}
            courtName={court.name}
            teams={court.teams}
          />
        ))}
      </div>
    </>
  );
};