import React from 'react';
import { Card } from 'antd';
import styled from 'styled-components';
import type { StandingEntry } from '../types';

interface Props {
  standings: StandingEntry[];
  groupName: string;
  qualifiedCount: number;
  isGroupComplete: boolean;
}

const StyledTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 28px;
  background-color: #1a1a1a;
  color: #fff;

  thead tr th {
    background-color: #0d0d0d;
    color: #01ff69;
    font-size: 30px;
    padding: 20px 16px;
    font-weight: bold;
    text-align: center;
    border: 1px solid #444;
  }

  tbody tr td {
    font-size: 28px;
    padding: 20px 16px;
    text-align: center;
    border: 1px solid #444;
  }

  tbody tr td:first-child {
    text-align: left;
  }
`;

const HighlightedRow = styled.tr`
  background-color: rgba(43, 217, 107, 0.2);
  font-weight: bold;
  border-left: 4px solid #01ff69;
  
  td {
    font-weight: bold;
    color: #01ff69 !important;
  }
`;

export const GroupStandings: React.FC<Props> = ({ standings, groupName, qualifiedCount, isGroupComplete }) => {
  const columns = [
    { key: 'team', label: 'Time', render: (val: StandingEntry) => val.teamName || `Time ${val.teamIndex}` },
    { key: 'points', label: 'P', render: (val: StandingEntry) => val.points },
    { key: 'played', label: 'J', render: (val: StandingEntry) => val.played },
    { key: 'wins', label: 'V', render: (val: StandingEntry) => val.wins },
    { key: 'losses', label: 'D', render: (val: StandingEntry) => val.losses },
    { key: 'setsWon', label: 'SP', render: (val: StandingEntry) => val.setsWon },
    { key: 'setsLost', label: 'SC', render: (val: StandingEntry) => val.setsLost },
    { key: 'setsDifference', label: 'SS', render: (val: StandingEntry) => val.setsDifference },
    { key: 'goalsFor', label: 'PP', render: (val: StandingEntry) => val.goalsFor },
    { key: 'goalsAgainst', label: 'PC', render: (val: StandingEntry) => val.goalsAgainst },
    { key: 'goalsDifference', label: 'SP', render: (val: StandingEntry) => val.goalsDifference },
  ];

  return (
    <Card
      title={groupName}
      style={{ marginBottom: 16, backgroundColor: '#1a1a1a', border: '1px solid #333' }}
      styles={{ header: { fontSize: 28, color: '#01ff69' } }}
    >
      <StyledTable>
        <thead>
          <tr>
            {columns.map(col => (
              <th key={col.key}>{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {standings.map((entry, idx) => {
            const isQualified = isGroupComplete && idx < qualifiedCount;
            const RowComponent = isQualified ? HighlightedRow : 'tr';
            return (
              <RowComponent key={entry.teamIndex}>
                {columns.map(col => (
                  <td key={col.key}>{col.render(entry)}</td>
                ))}
              </RowComponent>
            );
          })}
        </tbody>
      </StyledTable>
    </Card>
  );
};