'use client';

import React from 'react';

import type {
  DraftFixture,
  DraftPool,
  DraftTeam,
  StageType,
} from '@/lib/tournament-fixtures';

interface FixtureParticipantSelectorProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  stageType: StageType;
  teams: DraftTeam[];
  pools: DraftPool[];
  fixtures: DraftFixture[];
}

function ordinal(
  position: number
) {
  if (position === 1) return '1st';
  if (position === 2) return '2nd';
  if (position === 3) return '3rd';
  return `${position}th`;
}

export default function FixtureParticipantSelector({
  label,
  value,
  onChange,
  stageType,
  teams,
  pools,
  fixtures,
}: FixtureParticipantSelectorProps) {
  const isPoolFixture =
    stageType === 'POOL';

  return (
    <div>
      <label className="mb-1 block text-sm font-semibold text-slate-800">
        {label}
      </label>

      <select
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm"
      >
        <option value="">
          Select {label}
        </option>

        {isPoolFixture ? (
          <>
            <optgroup label="Schools">
              {teams.map((team) => (
                <option
                  key={team.id}
                  value={`TEAM:${team.id}`}
                >
                  {team.name}
                </option>
              ))}
            </optgroup>
          </>
        ) : (
          <>
            <optgroup label="Pool Positions">
              {pools.flatMap((pool) =>
                [1, 2, 3, 4, 5, 6, 7, 8].map(
                  (position) => (
                    <option
                      key={`${pool.id}-${position}`}
                      value={`POOL_POSITION:${pool.id}:${position}`}
                    >
                      {ordinal(position)}{' '}
                      {pool.name}
                    </option>
                  )
                )
              )}
            </optgroup>

            {fixtures.length > 0 && (
              <optgroup label="Previous Fixtures">
                {fixtures.map(
                  (fixture) => (
                    <React.Fragment
                      key={fixture.id}
                    >
                      <option
                        value={`MATCH_WINNER:${fixture.id}`}
                      >
                        Winner —{' '}
                        {fixture.stageName}{' '}
                        #{fixture.matchNumber}
                      </option>

                      <option
                        value={`MATCH_LOSER:${fixture.id}`}
                      >
                        Loser —{' '}
                        {fixture.stageName}{' '}
                        #{fixture.matchNumber}
                      </option>
                    </React.Fragment>
                  )
                )}
              </optgroup>
            )}
          </>
        )}
      </select>

      {value && (
        <p className="mt-1 text-[11px] text-slate-500">
          {formatSelection(
            value,
            teams,
            pools,
            fixtures
          )}
        </p>
      )}
    </div>
  );
}

function formatSelection(
  value: string,
  teams: DraftTeam[],
  pools: DraftPool[],
  fixtures: DraftFixture[]
) {
  if (value.startsWith('TEAM:')) {
    const id = value.substring(
      'TEAM:'.length
    );

    return (
      teams.find(
        (team) => team.id === id
      )?.name ?? value
    );
  }

  if (
    value.startsWith(
      'POOL_POSITION:'
    )
  ) {
    const parts = value.split(':');

    const pool = pools.find(
      (item) =>
        item.id === parts[1]
    );

    return `${ordinal(
      Number(parts[2])
    )} ${pool?.name ?? 'Unknown Pool'}`;
  }

  if (
    value.startsWith(
      'MATCH_WINNER:'
    )
  ) {
    const id = value.substring(
      'MATCH_WINNER:'.length
    );

    const fixture =
      fixtures.find(
        (item) => item.id === id
      );

    return `Winner ${fixture?.stageName ?? ''} #${
      fixture?.matchNumber ?? ''
    }`;
  }

  if (
    value.startsWith(
      'MATCH_LOSER:'
    )
  ) {
    const id = value.substring(
      'MATCH_LOSER:'.length
    );

    const fixture =
      fixtures.find(
        (item) => item.id === id
      );

    return `Loser ${fixture?.stageName ?? ''} #${
      fixture?.matchNumber ?? ''
    }`;
  }

  return value;
}
