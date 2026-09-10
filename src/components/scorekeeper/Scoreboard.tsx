'use client';

import TeamCard from '@/components/scorekeeper/TeamCard';

type TeamSide = 'home' | 'away';

type CapColor = 'white' | 'blue' | 'dark';

interface ScoreboardProps {
  homeTeamName: string;
  awayTeamName: string;
  homeScore: number;
  awayScore: number;
  homeCapColor: CapColor;
  awayCapColor: CapColor;
  selectedTeam: TeamSide;
  possession: TeamSide;
  onSelectTeam: (team: TeamSide) => void;
  onSetPossession: (team: TeamSide) => void;
  onHomeCapColorChange: (color: CapColor) => void;
  onAwayCapColorChange: (color: CapColor) => void;
}

export default function Scoreboard({
  homeTeamName,
  awayTeamName,
  homeScore,
  awayScore,
  homeCapColor,
  awayCapColor,
  selectedTeam,
  possession,
  onSelectTeam,
  onSetPossession,
  onHomeCapColorChange,
  onAwayCapColorChange,
}: ScoreboardProps) {
  return (
    <div className="grid min-w-0 grid-cols-1 gap-3 lg:grid-cols-2">
      <TeamCard
        team="home"
        teamName={homeTeamName}
        score={homeScore}
        capColor={homeCapColor}
        selectedTeam={selectedTeam}
        possession={possession}
        onSelectTeam={onSelectTeam}
        onSetPossession={onSetPossession}
        onCapColorChange={onHomeCapColorChange}
      />

      <TeamCard
        team="away"
        teamName={awayTeamName}
        score={awayScore}
        capColor={awayCapColor}
        selectedTeam={selectedTeam}
        possession={possession}
        onSelectTeam={onSelectTeam}
        onSetPossession={onSetPossession}
        onCapColorChange={onAwayCapColorChange}
      />
    </div>
  );
}