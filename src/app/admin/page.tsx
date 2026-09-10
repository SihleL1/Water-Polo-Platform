'use client';

import React, { useEffect, useState } from 'react';
import Header from '@/components/Header';
import {
  Trophy,
  Plus,
  Trash2,
  Users,
  Layers,
  Calendar,
} from 'lucide-react';
import * as XLSX from 'xlsx';

import FixtureParticipantSelector from '@/components/ParticipantSelector';

import type {
  DraftFixture,
  DraftPool,
  DraftTeam,
  MatchSlot,
  StageType,
  CapColor,
} from '@/lib/tournament-fixtures';

import { parseFixtureSlot } from '@/lib/fixture-slot-parser';

type DraftTournament = {
  name: string;
  start_date: string;
  end_date: string;
  location: string;
  status: 'active' | 'past';
  competition_category: 'BOYS' | 'GIRLS' | 'MIXED';
};

export default function AdminPage() {
  /*
   * =========================================================
   * TOURNAMENT
   * =========================================================
   */

  const [draftTournament, setDraftTournament] =
  useState<DraftTournament>({
    name: '',
    start_date: '',
    end_date: '',
    location: '',
    status: 'active',
    competition_category: 'BOYS',
  });

  /*
   * =========================================================
   * POOLS
   * =========================================================
   */

  const [draftPools, setDraftPools] =
    useState<DraftPool[]>([]);

  const [poolName, setPoolName] =
    useState('');

  /*
   * =========================================================
   * TEAMS / SCHOOLS
   * =========================================================
   */

  const [availableTeams, setAvailableTeams] =
    useState<DraftTeam[]>([]);

  const [draftTeams, setDraftTeams] =
    useState<DraftTeam[]>([]);

  const [selectedTeamId, setSelectedTeamId] =
    useState('');

  const [loadingTeams, setLoadingTeams] =
    useState(true);

  /*
   * =========================================================
   * FIXTURES
   * =========================================================
   */

  const [draftMatches, setDraftMatches] =
    useState<DraftFixture[]>([]);

  const [stageType, setStageType] =
    useState<StageType>('POOL');

  const [stageName, setStageName] =
    useState('Pool A');

  const [matchNumber, setMatchNumber] =
    useState(1);

  const [homeSource, setHomeSource] =
    useState('');

  const [awaySource, setAwaySource] =
    useState('');

  const [fixturePoolId, setFixturePoolId] =
    useState('');

  const [scheduledTime, setScheduledTime] =
    useState('');

  const [homeCap, setHomeCap] =
    useState<CapColor>('white');

  const [awayCap, setAwayCap] =
    useState<CapColor>('blue');

  /*
   * =========================================================
   * SPREADSHEET IMPORT
   * =========================================================
   */

  const [fixtureFile, setFixtureFile] =
    useState<File | null>(null);

  const [fixtureImporting, setFixtureImporting] =
    useState(false);

  const [fixtureImportErrors, setFixtureImportErrors] =
    useState<string[]>([]);

  /*
   * =========================================================
   * GENERAL UI
   * =========================================================
   */

  const [creating, setCreating] =
    useState(false);

  const [message, setMessage] =
    useState('');

  /*
   * =========================================================
   * LOAD EXISTING SCHOOLS
   * =========================================================
   */

  useEffect(() => {
    const loadTeams = async () => {
      try {
        setLoadingTeams(true);

        const response = await fetch(
          '/api/admin/teams'
        );

        const result = await response.json();

        if (!response.ok) {
          console.error(
            'Error loading teams:',
            result
          );

          setMessage(
            result.error ||
              'Could not load schools.'
          );

          return;
        }

        setAvailableTeams(
          (result.data ?? []).map(
            (team: {
              id: string;
              name: string;
            }) => ({
              id: team.id,
              name: team.name,
              poolId: null,
            })
          )
        );
      } catch (error) {
        console.error(
          'Could not load schools:',
          error
        );

        setMessage(
          'Could not load schools.'
        );
      } finally {
        setLoadingTeams(false);
      }
    };

    loadTeams();
  }, []);

  /*
   * =========================================================
   * POOL FUNCTIONS
   * =========================================================
   */

  const addPool = () => {
    const trimmedName =
      poolName.trim();

    if (!trimmedName) {
      setMessage(
        'Enter a pool name.'
      );
      return;
    }

    const duplicate =
      draftPools.some(
        (pool) =>
          pool.name.toLowerCase() ===
          trimmedName.toLowerCase()
      );

    if (duplicate) {
      setMessage(
        'That pool already exists.'
      );
      return;
    }

    const newPool: DraftPool = {
      id: crypto.randomUUID(),
      name: trimmedName,
    };

    setDraftPools((current) => [
      ...current,
      newPool,
    ]);

    setPoolName('');
    setMessage('');
  };

  const removePool = (
    poolId: string
  ) => {
    setDraftPools((current) =>
      current.filter(
        (pool) =>
          pool.id !== poolId
      )
    );

    setDraftTeams((current) =>
      current.map((team) =>
        team.poolId === poolId
          ? {
              ...team,
              poolId: null,
            }
          : team
      )
    );

    setDraftMatches((current) =>
      current.map((fixture) =>
        fixture.poolId === poolId
          ? {
              ...fixture,
              poolId: null,
            }
          : fixture
      )
    );
  };

  /*
   * =========================================================
   * TEAM FUNCTIONS
   * =========================================================
   */

  const addExistingTeam = () => {
    if (!selectedTeamId) {
      setMessage(
        'Select a school first.'
      );
      return;
    }

    const team =
      availableTeams.find(
        (item) =>
          item.id ===
          selectedTeamId
      );

    if (!team) {
      setMessage(
        'Selected school could not be found.'
      );
      return;
    }

    const alreadyAdded =
      draftTeams.some(
        (item) =>
          item.id === team.id
      );

    if (alreadyAdded) {
      setMessage(
        'That school is already in the tournament.'
      );
      return;
    }

    setDraftTeams((current) => [
      ...current,
      {
        id: team.id,
        name: team.name,
        poolId: null,
      },
    ]);

    setSelectedTeamId('');
    setMessage('');
  };

  const removeTeam = (
    teamId: string
  ) => {
    setDraftTeams((current) =>
      current.filter(
        (team) =>
          team.id !== teamId
      )
    );

    /*
     * Only remove fixtures where this
     * team is explicitly the participant.
     *
     * Dynamic fixtures can remain.
     */
    setDraftMatches((current) =>
      current.filter((fixture) => {
        const homeIsTeam =
          fixture.homeSlot.type ===
            'TEAM' &&
          fixture.homeSlot.teamId ===
            teamId;

        const awayIsTeam =
          fixture.awaySlot.type ===
            'TEAM' &&
          fixture.awaySlot.teamId ===
            teamId;

        return (
          !homeIsTeam &&
          !awayIsTeam
        );
      })
    );
  };

  const assignTeamPool = (
    teamId: string,
    poolId: string
  ) => {
    setDraftTeams((current) =>
      current.map((team) =>
        team.id === teamId
          ? {
              ...team,
              poolId:
                poolId || null,
            }
          : team
      )
    );
  };

  /*
   * =========================================================
   * CAP PARSER
   * =========================================================
   */

  const parseCap = (
    value: unknown,
    fallback: CapColor
  ): CapColor => {
    const normalized =
      String(value ?? '')
        .trim()
        .toLowerCase();

    if (
      normalized === 'white' ||
      normalized === 'blue' ||
      normalized === 'dark'
    ) {
      return normalized;
    }

    return fallback;
  };

  /*
   * =========================================================
   * FIXTURE FUNCTIONS
   * =========================================================
   */

  const addGenericFixture = () => {
    if (!homeSource || !awaySource) {
      setMessage(
        'Select both fixture participants.'
      );
      return;
    }

    if (
      stageType === 'POOL' &&
      homeSource === awaySource
    ) {
      setMessage(
        'A team cannot play against itself.'
      );
      return;
    }

    try {
      const homeSlot =
        parseFixtureSlot(
          homeSource,
          draftTeams,
          draftPools,
          draftMatches
        );

      const awaySlot =
        parseFixtureSlot(
          awaySource,
          draftTeams,
          draftPools,
          draftMatches
        );

      const newFixture: DraftFixture = {
        id: crypto.randomUUID(),

        stageType,

        stageName:
          stageName.trim() ||
          stageType,

        stageOrder:
          draftMatches.length + 1,

        matchNumber,

        homeSlot,

        awaySlot,

        poolId:
          stageType === 'POOL'
            ? fixturePoolId || null
            : null,

        scheduledTime,

        homeCapColor: homeCap,

        awayCapColor: awayCap,
      };

      setDraftMatches((current) => [
        ...current,
        newFixture,
      ]);

      setHomeSource('');
      setAwaySource('');
      setFixturePoolId('');
      setScheduledTime('');

      setMatchNumber(
        matchNumber + 1
      );

      setMessage('');
    } catch (error) {
      console.error(
        'Could not create fixture:',
        error
      );

      setMessage(
        error instanceof Error
          ? error.message
          : 'Could not create fixture.'
      );
    }
  };

  const removeFixture = (
    fixtureId: string
  ) => {
    setDraftMatches((current) =>
      current.filter(
        (fixture) =>
          fixture.id !== fixtureId
      )
    );
  };

  /*
   * =========================================================
   * SLOT DISPLAY
   * =========================================================
   */

  const getPoolName = (
    poolId: string | null
  ) => {
    if (!poolId) {
      return 'No Pool';
    }

    return (
      draftPools.find(
        (pool) =>
          pool.id === poolId
      )?.name ??
      'Unknown Pool'
    );
  };

  const getSlotDisplayName = (
    slot: MatchSlot
  ) => {
    if (slot.label) {
      return slot.label;
    }

    if (slot.type === 'TEAM') {
      return (
        draftTeams.find(
          (team) =>
            team.id ===
            slot.teamId
        )?.name ??
        availableTeams.find(
          (team) =>
            team.id ===
            slot.teamId
        )?.name ??
        'Unknown Team'
      );
    }

    if (
      slot.type ===
      'POOL_POSITION'
    ) {
      const pool =
        draftPools.find(
          (item) =>
            item.id ===
            slot.poolId
        );

      return `${slot.position} ${pool?.name ?? 'Unknown Pool'}`;
    }

    const source =
      draftMatches.find(
        (fixture) =>
          fixture.id ===
          slot.matchId
      );

    if (!source) {
      return slot.type ===
        'MATCH_WINNER'
        ? 'Winner of previous match'
        : 'Loser of previous match';
    }

    return `${
      slot.type ===
      'MATCH_WINNER'
        ? 'Winner'
        : 'Loser'
    } ${source.stageName} #${
      source.matchNumber
    }`;
  };

  /*
   * =========================================================
   * SPREADSHEET IMPORT
   * =========================================================
   */
const importFixtures = async () => {
  if (!fixtureFile) {
    setMessage('Select a spreadsheet first.');
    return;
  }

  try {
    setFixtureImporting(true);
    setFixtureImportErrors([]);
    setMessage('Reading fixture spreadsheet...');

    const buffer =
      await fixtureFile.arrayBuffer();

    const workbook = XLSX.read(buffer, {
      type: 'array',
    });

    const firstSheetName =
      workbook.SheetNames[0];

    if (!firstSheetName) {
      throw new Error(
        'The spreadsheet contains no worksheets.'
      );
    }

    const sheet =
      workbook.Sheets[firstSheetName];

    if (!sheet) {
      throw new Error(
        'Could not read the first worksheet.'
      );
    }

    function parseImportedFixtureSlot(
  value: string,
  teams: DraftTeam[],
  pools: DraftPool[],
  fixtures: DraftFixture[]
): MatchSlot {
  const normalized =
    value
      .trim()
      .toLowerCase();

  /*
   * ========================================================
   * EXACT SCHOOL NAME
   * ========================================================
   */

  const exactTeam =
    teams.find(
      (team) =>
        team.name
          .trim()
          .toLowerCase() ===
        normalized
    );

  if (exactTeam) {
    return {
      type: 'TEAM',
      teamId: exactTeam.id,
      label: exactTeam.name,
    };
  }

  /*
   * ========================================================
   * SCHOOL NAME WITH LOCATION
   *
   * Example:
   * Crawford Lonehill (Johannesburg)
   * ========================================================
   */

  const teamWithoutLocation =
    normalized.replace(
      /\s*\([^)]*\)\s*$/g,
      ''
    );

  const locationTeam =
    teams.find(
      (team) =>
        team.name
          .trim()
          .toLowerCase() ===
        teamWithoutLocation
    );

  if (locationTeam) {
    return {
      type: 'TEAM',
      teamId:
        locationTeam.id,
      label:
        locationTeam.name,
    };
  }

  /*
   * ========================================================
   * POOL POSITION
   *
   * Examples:
   * 1st Pool A
   * 2nd Pool B
   * GIRLS Group A1
   * ========================================================
   */

  const ordinalPoolMatch =
    value.match(
      /^(\d+)(?:st|nd|rd|th)\s+(.+)$/i
    );

  if (ordinalPoolMatch) {
    const position =
      Number(
        ordinalPoolMatch[1]
      );

    const poolText =
      ordinalPoolMatch[2]
        .trim();

    const pool =
      pools.find(
        (item) =>
          item.name
            .trim()
            .toLowerCase() ===
          poolText
            .toLowerCase()
      );

    if (!pool) {
      throw new Error(
        `Pool "${poolText}" was not found.`
      );
    }

    return {
      type: 'POOL_POSITION',
      poolId: pool.id,
      position,
      label: value,
    };
  }

  /*
   * ========================================================
   * GROUP A1 / GROUP B3 / GROUP C5
   *
   * Example:
   * GIRLS Group A2
   *
   * This means 2nd place in Group A.
   * ========================================================
   */

  const groupPositionMatch =
    value.match(
      /(?:girls\s+)?group\s+([a-z])(\d+)$/i
    );

  if (groupPositionMatch) {
    const groupLetter =
      groupPositionMatch[1]
        .toUpperCase();

    const position =
      Number(
        groupPositionMatch[2]
      );

    const possibleNames = [
      `Group ${groupLetter}`,
      `GIRLS Group ${groupLetter}`,
    ];

    const pool =
      pools.find(
        (item) =>
          possibleNames.some(
            (name) =>
              item.name
                .trim()
                .toLowerCase() ===
              name.toLowerCase()
          )
      );

    if (!pool) {
      throw new Error(
        `Pool/Group "${groupLetter}" was not found.`
      );
    }

    return {
      type: 'POOL_POSITION',
      poolId: pool.id,
      position,
      label: value,
    };
  }

  /*
   * ========================================================
   * WINNER / LOSER GAME REFERENCES
   *
   * Examples:
   * GIRLS Winner Game 43
   * GIRLS Loser Game 45
   * Winner Game 43
   * Loser Game 45
   * ========================================================
   */

  const resultMatch =
    value.match(
      /^(?:girls\s+)?(winner|loser)\s+game\s+(\d+)(?:\s*\([^)]*\))?$/i
    );

  if (resultMatch) {
    const resultType =
      resultMatch[1]
        .toLowerCase();

    const gameNumber =
      Number(
        resultMatch[2]
      );

    const fixture =
      fixtures.find(
        (item) =>
          item.matchNumber ===
          gameNumber
      );

    if (!fixture) {
      throw new Error(
        `Game ${gameNumber} could not be found.`
      );
    }

    return {
      type:
        resultType === 'winner'
          ? 'MATCH_WINNER'
          : 'MATCH_LOSER',

      matchId:
        fixture.id,

      label: value,
    };
  }

  throw new Error(
    `"${value}" could not be matched to a school, pool position, or previous game.`
  );
}

    /*
     * ========================================================
     * READ SHEET
     * ========================================================
     */

    const rawRows =
      XLSX.utils.sheet_to_json<
        Record<string, unknown>
      >(sheet, {
        defval: '',
      });

    /*
     * ========================================================
     * NORMALISE COLUMN NAMES
     *
     * Allows:
     * STAGE NAME
     * Stage Name
     * stage name
     * ========================================================
     */

    const normaliseHeader = (
      value: unknown
    ) =>
      String(value ?? '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ');

    const getColumn = (
      row: Record<string, unknown>,
      ...possibleNames: string[]
    ) => {
      const wanted =
        possibleNames.map(
          normaliseHeader
        );

      const actualKey =
        Object.keys(row).find(
          (key) =>
            wanted.includes(
              normaliseHeader(key)
            )
        );

      return actualKey
        ? row[actualKey]
        : '';
    };

    /*
     * ========================================================
     * IMPORT
     * ========================================================
     */

    const imported: DraftFixture[] = [];
    const errors: string[] = [];

    for (
      let index = 0;
      index < rawRows.length;
      index += 1
    ) {
      const row = rawRows[index];

      const rowNumber =
        index + 2;

      try {
        /*
         * ----------------------------------------------------
         * STAGE TYPE
         * ----------------------------------------------------
         */

        let rawStageType =
          String(
            getColumn(
              row,
              'Stage Type',
              'STAGE TYPE'
            )
          )
            .trim()
            .toUpperCase();

        /*
         * Allow common spreadsheet wording
         */

        rawStageType =
          rawStageType
            .replace(
              /[-\s]+/g,
              '_'
            );

        const stageTypeMap: Record<
          string,
          StageType
        > = {
          POOL: 'POOL',
          CROSSOVER: 'CROSSOVER',

          'QUARTER_FINAL':
            'QUARTER-FINAL',

          SEMI_FINAL:
            'SEMI-FINAL',

          PLACEMENT:
            'PLACEMENT',

          FINAL:
            'FINAL',
        };

        const rowStageType =
          stageTypeMap[
            rawStageType
          ];

        if (!rowStageType) {
          throw new Error(
            `Invalid Stage Type "${rawStageType}".`
          );
        }

        /*
         * ----------------------------------------------------
         * STAGE NAME
         * ----------------------------------------------------
         */

        const rowStageName =
          String(
            getColumn(
              row,
              'Stage Name',
              'STAGE NAME'
            )
          ).trim();

        if (!rowStageName) {
          throw new Error(
            'Stage Name is required.'
          );
        }

        /*
         * ----------------------------------------------------
         * MATCH NUMBER
         * ----------------------------------------------------
         *
         * Accepts:
         * 1
         * G#1
         * G1
         * #1
         * Match 1
         * ----------------------------------------------------
         */

        const rawMatchNumber =
          String(
            getColumn(
              row,
              'Match #',
              'MATCH #',
              'Match Number',
              'MATCH NUMBER'
            )
          ).trim();

        const matchNumberMatch =
          rawMatchNumber.match(
            /(\d+)/
          );

        if (!matchNumberMatch) {
          throw new Error(
            `Invalid Match # "${rawMatchNumber}".`
          );
        }

        const rowMatchNumber =
          Number(
            matchNumberMatch[1]
          );

        /*
         * ----------------------------------------------------
         * HOME / AWAY
         * ----------------------------------------------------
         */

        const home =
          String(
            getColumn(
              row,
              'Home',
              'HOME'
            )
          ).trim();

        const away =
          String(
            getColumn(
              row,
              'Away',
              'AWAY'
            )
          ).trim();

        if (!home) {
          throw new Error(
            'Home participant is required.'
          );
        }

        if (!away) {
          throw new Error(
            'Away participant is required.'
          );
        }

        /*
         * ----------------------------------------------------
         * POOL
         * ----------------------------------------------------
         */

        const poolName =
          String(
            getColumn(
              row,
              'Pool',
              'POOL'
            )
          ).trim();

        /*
         * ----------------------------------------------------
         * TIME
         * ----------------------------------------------------
         */

        const rowScheduledTime =
          String(
            getColumn(
              row,
              'Scheduled Time',
              'SCHEDULED TIME'
            )
          ).trim();

        /*
         * ----------------------------------------------------
         * CAP COLOURS
         * ----------------------------------------------------
         */

        const homeCapValue =
          getColumn(
            row,
            'Home Cap',
            'HOME CAP',
            'Home Cap Colour',
            'HOME CAP COLOUR'
          );

        const awayCapValue =
          getColumn(
            row,
            'Away Cap',
            'AWAY CAP',
            'Away Cap Colour',
            'AWAY CAP COLOUR'
          );

        /*
         * ----------------------------------------------------
         * POOL LOOKUP
         * ----------------------------------------------------
         */

        const pool =
          draftPools.find(
            (item) =>
              normaliseHeader(
                item.name
              ) ===
              normaliseHeader(
                poolName
              )
          );

        if (
          poolName &&
          !pool
        ) {
          /*
           * "Playoffs", "Quarter Finals", etc.
           * aren't actual pool groups, so only reject
           * the value when this is genuinely a pool fixture.
           */

          if (
            rowStageType ===
            'POOL'
          ) {
            throw new Error(
              `Pool "${poolName}" was not found.`
            );
          }
        }

        /*
         * ----------------------------------------------------
         * BUILD FIXTURE LOOKUP
         * ----------------------------------------------------
         */

        const allFixtures = [
          ...draftMatches,
          ...imported,
        ];

        /*
         * ----------------------------------------------------
         * RESOLVE HOME
         * ----------------------------------------------------
         */

        const homeSlot =
          parseImportedFixtureSlot(
            home,
            availableTeams,
            draftPools,
            allFixtures
          );

        /*
         * ----------------------------------------------------
         * RESOLVE AWAY
         * ----------------------------------------------------
         */

        const awaySlot =
          parseImportedFixtureSlot(
            away,
            availableTeams,
            draftPools,
            allFixtures
          );

        /*
         * ----------------------------------------------------
         * CREATE FIXTURE
         * ----------------------------------------------------
         */

        imported.push({
          id: crypto.randomUUID(),

          stageType:
            rowStageType,

          stageName:
            rowStageName,

          stageOrder:
            imported.length + 1,

          matchNumber:
            rowMatchNumber,

          homeSlot,

          awaySlot,

          poolId:
            pool?.id ?? null,

          scheduledTime:
            rowScheduledTime,

          homeCapColor:
            parseCap(
              homeCapValue,
              'white'
            ),

          awayCapColor:
            parseCap(
              awayCapValue,
              'blue'
            ),
        });
      } catch (error) {
        errors.push(
          `Row ${rowNumber}: ${
            error instanceof Error
              ? error.message
              : 'Invalid fixture.'
          }`
        );
      }
    }

    /*
     * ========================================================
     * UPDATE UI
     * ========================================================
     */

    setDraftMatches(
      (current) => [
        ...current,
        ...imported,
      ]
    );

    setFixtureImportErrors(
      errors
    );

    if (errors.length > 0) {
      setMessage(
        `${imported.length} fixtures imported with ${errors.length} error(s).`
      );
    } else {
      setMessage(
        `${imported.length} fixtures imported successfully.`
      );
    }
  } catch (error) {
    console.error(
      'Fixture import error:',
      error
    );

    setMessage(
      error instanceof Error
        ? error.message
        : 'Unable to read the spreadsheet.'
    );
  } finally {
    setFixtureImporting(false);
  }
};

  /*
   * =========================================================
   * VALIDATION
   * =========================================================
   */

  const tournamentDetailsComplete =
    draftTournament.name.trim() !== '' &&
    draftTournament.start_date !== '' &&
    draftTournament.end_date !== '';

  const hasEnoughTeams =
    draftTeams.length >= 2;

  const canCreateTournament =
    tournamentDetailsComplete &&
    hasEnoughTeams &&
    !creating;

  /*
   * =========================================================
   * CREATE TOURNAMENT
   * =========================================================
   */

  const handleCreateTournament =
    async () => {
      if (!canCreateTournament) {
        setMessage(
          'Please complete the tournament details and add at least 2 schools.'
        );
        return;
      }

      try {
        setCreating(true);

        setMessage(
          'Creating tournament...'
        );

        const response =
          await fetch(
            '/api/admin/tournaments/create',
            {
              method: 'POST',

              headers: {
                'Content-Type':
                  'application/json',
              },

              body: JSON.stringify({
                tournament:
                  draftTournament,

                pools:
                  draftPools,

                teams:
                  draftTeams,

                matches:
                  draftMatches,
              }),
            }
          );

        const result =
          await response.json();

        if (!response.ok) {
          console.error(
            result
          );

          setMessage(
            result.error ||
              'Failed to create tournament.'
          );

          return;
        }

        setMessage(
          `Tournament "${draftTournament.name}" created successfully!`
        );

        setDraftTournament({
          name: '',
          start_date: '',
          end_date: '',
          location: '',
          status: 'active',
          competition_category: 'BOYS',
        });

        setDraftPools([]);
        setDraftTeams([]);
        setDraftMatches([]);

        setHomeSource('');
        setAwaySource('');
        setFixturePoolId('');
        setStageType('POOL');
        setStageName('Pool A');
        setMatchNumber(1);

        console.log(
          'Tournament created:',
          result
        );
      } catch (error) {
        console.error(
          error
        );

        setMessage(
          'Something went wrong while creating the tournament.'
        );
      } finally {
        setCreating(false);
      }
    };

  /*
   * =========================================================
   * RENDER
   * =========================================================
   */

  return (
    <div
      className="min-h-screen p-6 font-sans"
      style={{
        background:
          'var(--bg-soft)',
      }}
    >
      <Header />

      <main className="mx-auto max-w-6xl space-y-6">

        {/* ===================================================
            PAGE HEADER
        =================================================== */}

        <section
          className="rounded-2xl border bg-white p-6 shadow-sm"
          style={{
            borderColor:
              'var(--muted-slate)',
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="rounded-xl p-3"
              style={{
                background:
                  'var(--veldt-green)',
                color: 'white',
              }}
            >
              <Trophy size={28} />
            </div>

            <div>
              <h1
                className="text-3xl font-black"
                style={{
                  color:
                    'var(--veldt-green)',
                }}
              >
                Create Tournament
              </h1>

              <p
                className="mt-1 text-sm"
                style={{
                  color:
                    'var(--muted-text)',
                }}
              >
                Build the tournament,
                pools, schools and complete
                fixture structure before
                publishing it.
              </p>
            </div>
          </div>
        </section>

        {/* ===================================================
            TOURNAMENT DETAILS
        =================================================== */}

        {/* ===================================================
    TOURNAMENT DETAILS
=================================================== */}

<section
  className="rounded-2xl border bg-white p-6"
  style={{
    borderColor: 'var(--muted-slate)',
  }}
>
  <div className="mb-5 flex items-center gap-2">
    <Trophy
      size={20}
      style={{
        color: 'var(--veldt-ochre)',
      }}
    />

    <h2
      className="font-bold"
      style={{
        color: 'var(--veldt-green)',
      }}
    >
      Tournament Details
    </h2>
  </div>

  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

    {/* TOURNAMENT NAME */}

    <input
      value={draftTournament.name}
      onChange={(event) =>
        setDraftTournament({
          ...draftTournament,
          name: event.target.value,
        })
      }
      placeholder="Tournament Name"
      className="rounded-lg border p-3"
      style={{
        borderColor: 'var(--muted-slate)',
      }}
    />

    {/* LOCATION */}

    <input
      value={draftTournament.location}
      onChange={(event) =>
        setDraftTournament({
          ...draftTournament,
          location: event.target.value,
        })
      }
      placeholder="Location"
      className="rounded-lg border p-3"
      style={{
        borderColor: 'var(--muted-slate)',
      }}
    />

    {/* COMPETITION */}

    <div>
      <label className="mb-1 block text-sm font-semibold">
        Competition
      </label>

      <select
        value={
          draftTournament.competition_category
        }
        onChange={(event) =>
          setDraftTournament({
            ...draftTournament,
            competition_category:
              event.target.value as
                | 'BOYS'
                | 'GIRLS'
                | 'MIXED',
          })
        }
        className="w-full rounded-lg border p-3"
        style={{
          borderColor:
            'var(--muted-slate)',
        }}
      >
        <option value="BOYS">
          Boys
        </option>

        <option value="GIRLS">
          Girls
        </option>

        <option value="MIXED">
          Mixed
        </option>
      </select>
    </div>

    {/* START DATE */}

    <div>
      <label className="mb-1 block text-sm font-semibold">
        Start Date
      </label>

      <input
        type="date"
        value={
          draftTournament.start_date
        }
        onChange={(event) =>
          setDraftTournament({
            ...draftTournament,
            start_date:
              event.target.value,
          })
        }
        className="w-full rounded-lg border p-3"
        style={{
          borderColor:
            'var(--muted-slate)',
        }}
      />
    </div>

    {/* END DATE */}

    <div>
      <label className="mb-1 block text-sm font-semibold">
        End Date
      </label>

      <input
        type="date"
        value={
          draftTournament.end_date
        }
        onChange={(event) =>
          setDraftTournament({
            ...draftTournament,
            end_date:
              event.target.value,
          })
        }
        className="w-full rounded-lg border p-3"
        style={{
          borderColor:
            'var(--muted-slate)',
        }}
      />
    </div>

    {/* TOURNAMENT STATUS */}

    <div>
      <label className="mb-1 block text-sm font-semibold">
        Tournament Status
      </label>

      <select
        value={
          draftTournament.status
        }
        onChange={(event) =>
          setDraftTournament({
            ...draftTournament,
            status:
              event.target.value as
                | 'active'
                | 'past',
          })
        }
        className="w-full rounded-lg border p-3"
        style={{
          borderColor:
            'var(--muted-slate)',
        }}
      >
        <option value="active">
          Active Tournament
        </option>

        <option value="past">
          Past Tournament
        </option>
      </select>
    </div>

  </div>
</section>

        {/* ===================================================
            POOLS
        =================================================== */}

        <section
          className="rounded-2xl border bg-white p-6"
          style={{
            borderColor:
              'var(--muted-slate)',
          }}
        >
          <div className="mb-5 flex items-center gap-2">
            <Layers
              size={20}
              style={{
                color:
                  'var(--veldt-ochre)',
              }}
            />

            <h2
              className="font-bold"
              style={{
                color:
                  'var(--veldt-green)',
              }}
            >
              Pool Groups
            </h2>
          </div>

          <div className="flex gap-3">
            <input
              value={poolName}
              onChange={(event) =>
                setPoolName(
                  event.target.value
                )
              }
              placeholder="Pool Name (e.g. Pool A)"
              className="flex-1 rounded-lg border p-3"
              style={{
                borderColor:
                  'var(--muted-slate)',
              }}
            />

            <button
              type="button"
              onClick={addPool}
              className="flex items-center gap-2 rounded-lg px-5 py-3 font-bold"
              style={{
                background:
                  'var(--veldt-green)',
                color: 'white',
              }}
            >
              <Plus size={18} />
              Add Pool
            </button>
          </div>

          {draftPools.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-3">
              {draftPools.map(
                (pool) => (
                  <div
                    key={pool.id}
                    className="flex items-center gap-3 rounded-lg border px-4 py-2"
                    style={{
                      borderColor:
                        'var(--muted-slate)',
                    }}
                  >
                    <span className="font-semibold">
                      {pool.name}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        removePool(
                          pool.id
                        )
                      }
                      style={{
                        color:
                          '#dc2626',
                      }}
                    >
                      <Trash2
                        size={16}
                      />
                    </button>
                  </div>
                )
              )}
            </div>
          )}
        </section>

        {/* ===================================================
            TOURNAMENT SCHOOLS
        =================================================== */}

        <section
          className="rounded-2xl border bg-white p-6"
          style={{
            borderColor:
              'var(--muted-slate)',
          }}
        >
          <div className="mb-5 flex items-center gap-2">
            <Users
              size={20}
              style={{
                color:
                  'var(--veldt-ochre)',
              }}
            />

            <div>
              <h2
                className="font-bold"
                style={{
                  color:
                    'var(--veldt-green)',
                }}
              >
                Tournament Schools
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Select schools from your
                permanent database.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <select
              value={selectedTeamId}
              onChange={(event) =>
                setSelectedTeamId(
                  event.target.value
                )
              }
              disabled={loadingTeams}
              className="flex-1 rounded-lg border p-3"
              style={{
                borderColor:
                  'var(--muted-slate)',
              }}
            >
              <option value="">
                {loadingTeams
                  ? 'Loading schools...'
                  : 'Select a school'}
              </option>

              {availableTeams
                .filter(
                  (team) =>
                    !draftTeams.some(
                      (selected) =>
                        selected.id ===
                        team.id
                    )
                )
                .map(
                  (team) => (
                    <option
                      key={team.id}
                      value={team.id}
                    >
                      {team.name}
                    </option>
                  )
                )}
            </select>

            <button
              type="button"
              onClick={
                addExistingTeam
              }
              className="flex items-center gap-2 rounded-lg px-5 py-3 font-bold"
              style={{
                background:
                  'var(--veldt-green)',
                color: 'white',
              }}
            >
              <Plus size={18} />
              Add School
            </button>
          </div>

          {draftTeams.length > 0 && (
            <div className="mt-5 space-y-3">
              {draftTeams.map(
                (team) => (
                  <div
                    key={team.id}
                    className="grid grid-cols-1 items-center gap-4 rounded-xl border p-4 md:grid-cols-[1fr_250px_auto]"
                    style={{
                      borderColor:
                        'var(--muted-slate)',
                    }}
                  >
                    <div className="font-bold">
                      {team.name}
                    </div>

                    <select
                      value={
                        team.poolId ??
                        ''
                      }
                      onChange={(
                        event
                      ) =>
                        assignTeamPool(
                          team.id,
                          event
                            .target
                            .value
                        )
                      }
                      className="rounded-lg border p-2"
                      style={{
                        borderColor:
                          'var(--muted-slate)',
                      }}
                    >
                      <option value="">
                        No Pool Assigned
                      </option>

                      {draftPools.map(
                        (pool) => (
                          <option
                            key={
                              pool.id
                            }
                            value={
                              pool.id
                            }
                          >
                            {pool.name}
                          </option>
                        )
                      )}
                    </select>

                    <button
                      type="button"
                      onClick={() =>
                        removeTeam(
                          team.id
                        )
                      }
                      className="flex items-center justify-center"
                      style={{
                        color:
                          '#dc2626',
                      }}
                    >
                      <Trash2
                        size={18}
                      />
                    </button>
                  </div>
                )
              )}
            </div>
          )}
        </section>

        {/* ===================================================
            FIXTURE BUILDER
        =================================================== */}

        <section
          className="rounded-2xl border bg-white p-6"
          style={{
            borderColor:
              'var(--muted-slate)',
          }}
        >
          <div className="mb-6 flex items-start gap-3">
            <Calendar
              size={20}
              style={{
                color:
                  'var(--veldt-ochre)',
              }}
            />

            <div>
              <h2
                className="font-bold"
                style={{
                  color:
                    'var(--veldt-green)',
                }}
              >
                Fixture Builder
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Build pool, crossover,
                knockout and placement
                fixtures.
              </p>
            </div>
          </div>

          {/* SPREADSHEET IMPORT */}

          <div className="mb-6 rounded-xl border bg-[#F8F9FA] p-4">
            <h3 className="font-bold text-slate-900">
              Import Fixture Spreadsheet
            </h3>

            <p className="mt-1 text-xs text-slate-500">
              Required columns:
              Stage Type, Stage Name,
              Match #, Home, Away.
              Optional: Pool,
              Scheduled Time,
              Home Cap, Away Cap.
            </p>

            <div className="mt-3 flex flex-col gap-3 md:flex-row">
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(
                  event
                ) =>
                  setFixtureFile(
                    event.target
                      .files?.[0] ??
                      null
                  )
                }
                className="flex-1 rounded-lg border bg-white p-3"
              />

              <button
                type="button"
                disabled={
                  !fixtureFile ||
                  fixtureImporting
                }
                onClick={
                  importFixtures
                }
                className="rounded-lg px-5 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
                style={{
                  background:
                    'var(--veldt-green)',
                }}
              >
                {fixtureImporting
                  ? 'Importing...'
                  : 'Import Fixtures'}
              </button>
            </div>

            {fixtureImportErrors.length >
              0 && (
              <div className="mt-3 rounded-lg bg-red-50 p-3 text-xs text-red-700">
                {fixtureImportErrors.map(
                  (error, index) => (
                    <div
                      key={`${error}-${index}`}
                    >
                      {error}
                    </div>
                  )
                )}
              </div>
            )}
          </div>

          {/* MANUAL FIXTURE BUILDER */}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
            <select
              value={stageType}
              onChange={(event) =>
                setStageType(
                  event.target
                    .value as StageType
                )
              }
              className="rounded-lg border p-3"
            >
              <option value="POOL">
                Pool
              </option>

              <option value="CROSSOVER">
                Crossover
              </option>

              <option value="KNOCKOUT">
                Knockout
              </option>

              <option value="PLACEMENT">
                Placement
              </option>
            </select>

            <input
              value={stageName}
              onChange={(event) =>
                setStageName(
                  event.target.value
                )
              }
              placeholder="Stage Name"
              className="rounded-lg border p-3"
            />

            <input
              type="number"
              min={1}
              value={matchNumber}
              onChange={(event) =>
                setMatchNumber(
                  Number(
                    event.target
                      .value
                  )
                )
              }
              placeholder="Match #"
              className="rounded-lg border p-3"
            />

            <input
              type="datetime-local"
              value={
                scheduledTime
              }
              onChange={(
                event
              ) =>
                setScheduledTime(
                  event.target.value
                )
              }
              className="rounded-lg border p-3"
            />

            {stageType ===
              'POOL' ? (
              <select
                value={
                  fixturePoolId
                }
                onChange={(
                  event
                ) =>
                  setFixturePoolId(
                    event.target
                      .value
                  )
                }
                className="rounded-lg border p-3"
              >
                <option value="">
                  No Pool
                </option>

                {draftPools.map(
                  (pool) => (
                    <option
                      key={
                        pool.id
                      }
                      value={
                        pool.id
                      }
                    >
                      {pool.name}
                    </option>
                  )
                )}
              </select>
            ) : (
              <div />
            )}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <FixtureParticipantSelector
              label="Home"
              value={
                homeSource
              }
              onChange={
                setHomeSource
              }
              stageType={
                stageType
              }
              teams={
                draftTeams
              }
              pools={
                draftPools
              }
              fixtures={
                draftMatches
              }
            />

            <FixtureParticipantSelector
              label="Away"
              value={
                awaySource
              }
              onChange={
                setAwaySource
              }
              stageType={
                stageType
              }
              teams={
                draftTeams
              }
              pools={
                draftPools
              }
              fixtures={
                draftMatches
              }
            />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <select
              value={
                homeCap
              }
              onChange={(
                event
              ) =>
                setHomeCap(
                  event.target
                    .value as CapColor
                )
              }
              className="rounded-lg border p-3"
            >
              <option value="white">
                Home: White Caps
              </option>

              <option value="blue">
                Home: Blue Caps
              </option>

              <option value="dark">
                Home: Dark Caps
              </option>
            </select>

            <select
              value={
                awayCap
              }
              onChange={(
                event
              ) =>
                setAwayCap(
                  event.target
                    .value as CapColor
                )
              }
              className="rounded-lg border p-3"
            >
              <option value="blue">
                Away: Blue Caps
              </option>

              <option value="white">
                Away: White Caps
              </option>

              <option value="dark">
                Away: Dark Caps
              </option>
            </select>
          </div>

          <button
            type="button"
            onClick={
              addGenericFixture
            }
            className="mt-4 w-full rounded-lg px-5 py-3 font-bold"
            style={{
              background:
                'var(--veldt-green)',
              color: 'white',
            }}
          >
            Add Fixture
          </button>

          {/* FIXTURE LIST */}

          {draftMatches.length >
            0 && (
            <div className="mt-6 space-y-3">
              {draftMatches.map(
                (fixture) => (
                  <div
                    key={
                      fixture.id
                    }
                    className="flex flex-col gap-3 rounded-xl border p-4 md:flex-row md:items-center md:justify-between"
                    style={{
                      borderColor:
                        'var(--muted-slate)',
                    }}
                  >
                    <div>
                      <div className="font-bold">
                        {
                          getSlotDisplayName(
                            fixture.homeSlot
                          )
                        }

                        {' vs '}

                        {
                          getSlotDisplayName(
                            fixture.awaySlot
                          )
                        }
                      </div>

                      <div className="mt-1 text-sm text-slate-500">
                        {
                          fixture.stageName
                        }

                        {' • Match #'}

                        {
                          fixture.matchNumber
                        }

                        {fixture.poolId
                          ? ` • ${getPoolName(
                              fixture.poolId
                            )}`
                          : ''}

                        {fixture.scheduledTime
                          ? ` • ${fixture.scheduledTime}`
                          : ''}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        removeFixture(
                          fixture.id
                        )
                      }
                      className="flex items-center justify-center self-start text-red-600 md:self-auto"
                    >
                      <Trash2
                        size={18}
                      />
                    </button>
                  </div>
                )
              )}
            </div>
          )}
        </section>

        {/* ===================================================
            REVIEW
        =================================================== */}

        <section
          className="rounded-2xl border p-6"
          style={{
            borderColor:
              'var(--veldt-ochre)',
            background: '#fff',
          }}
        >
          <h2
            className="text-xl font-black"
            style={{
              color:
                'var(--veldt-green)',
            }}
          >
            Tournament Review
          </h2>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="rounded-xl bg-[#F8F9FA] p-4">
              <div className="text-sm text-gray-500">
                Tournament
              </div>

              <div className="font-bold">
                {draftTournament.name ||
                  'Not completed'}
              </div>
            </div>

            <div className="rounded-xl bg-[#F8F9FA] p-4">
              <div className="text-sm text-gray-500">
                Pools
              </div>

              <div className="text-2xl font-black">
                {draftPools.length}
              </div>
            </div>

            <div className="rounded-xl bg-[#F8F9FA] p-4">
              <div className="text-sm text-gray-500">
                Schools
              </div>

              <div className="text-2xl font-black">
                {draftTeams.length}
              </div>
            </div>

            <div className="rounded-xl bg-[#F8F9FA] p-4">
              <div className="text-sm text-gray-500">
                Fixtures
              </div>

              <div className="text-2xl font-black">
                {draftMatches.length}
              </div>
            </div>
          </div>

          <button
            type="button"
            disabled={
              !canCreateTournament
            }
            onClick={
              handleCreateTournament
            }
            className="mt-6 w-full rounded-xl px-6 py-4 text-lg font-black transition disabled:cursor-not-allowed disabled:opacity-40"
            style={{
              background:
                'var(--veldt-ochre)',
              color: '#000',
            }}
          >
            {creating
              ? 'Creating Tournament...'
              : 'CREATE TOURNAMENT'}
          </button>

          {message && (
            <p
              className="mt-4 text-center text-sm font-semibold"
              style={{
                color:
                  'var(--veldt-green)',
              }}
            >
              {message}
            </p>
          )}
        </section>
      </main>
    </div>
  );
}

