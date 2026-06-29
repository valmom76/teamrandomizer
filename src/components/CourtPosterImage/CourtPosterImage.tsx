import { forwardRef } from 'react';
import './CourtPosterImage.css';

export interface TeamPlayer {
  id: string | number;
  name: string;
}

export interface PosterTeam {
  teamIndex: number;
  name: string;
  players: TeamPlayer[];
}

interface CourtPosterImageProps {
  courtName: string;
  teams: PosterTeam[];
  sessionDate?: string;
  sessionTime?: string;
}

export const CourtPosterImage = forwardRef<HTMLDivElement, CourtPosterImageProps>(
  ({ courtName, teams, sessionDate, sessionTime }, ref) => {
    const normalizedTeams = Array.from({ length: 4 }).map((_, index) => {
      return (
        teams[index] || {
          teamIndex: index,
          name: '',
          players: [],
        }
      );
    });

    return (
      <div className="court-image-poster" ref={ref}>
        <div className="court-image-bg" />

        <header className="court-image-header">
          <div className="court-image-line" />
          <h1>{courtName}</h1>
          {(sessionDate || sessionTime) && (
            <div className="court-image-datetime">
              {sessionDate && <span>{sessionDate}</span>}
              {sessionDate && sessionTime && <span> • </span>}
              {sessionTime && <span>{sessionTime}</span>}
            </div>
          )}
        </header>

        <img
          src="/images/boraver-logo-transparent.png"
          alt="Boraver"
          className="court-image-logo"
        />

        <section className="court-image-layout">
          {normalizedTeams.map((team, index) => (
            <article
              className={`team-poster-card team-slot-${index}`}
              key={`${team.teamIndex}-${index}`}
            >
              <div className="team-poster-title">
                <span>{team.name || `TIME ${index + 1}`}</span>
              </div>

              <div className="team-poster-players">
                {team.players.length > 0 ? (
                  team.players.map((player) => (
                    <div className="team-player-row" key={player.id}>
                      <div className="team-player-icon" />
                      <span className="team-player-name">{player.name}</span>
                    </div>
                  ))
                ) : (
                  <div className="team-player-empty">Sem jogadores</div>
                )}
              </div>
            </article>
          ))}
        </section>
      </div>
    );
  }
);

CourtPosterImage.displayName = 'CourtPosterImage';