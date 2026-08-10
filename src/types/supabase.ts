export type Tournament = {
  id: string;
  name: string;
  start_date?: string | null;
  end_date?: string | null;
  location?: string | null;
};

export type PoolGroup = {
  id: string;
  tournament_id: string;
  name: string;
};

export type Team = {
  id: string;
  name: string;
  tournament_id?: string | null;
  pool_group_id?: string | null;
};

export type Match = {
  id: string;
  tournament_id?: string | null;
  pool_group_id?: string | null;
  home_team_id?: string | null;
  away_team_id?: string | null;
  home_score?: number;
  away_score?: number;
  period?: number;
  home_cap_color?: string | null;
  away_cap_color?: string | null;
  status?: string | null;
};

export type MatchEvent = {
  id: string;
  match_id: string;
  period: number;
  game_clock: number;
  team_id: string;
  primary_player_cap: string;
  event_category: string;
  created_at?: string;
};
