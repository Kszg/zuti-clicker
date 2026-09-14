import { prisma } from "../prisma";
import { Prisma } from "../../../generated/prisma/client";
import type { LeaderboardField } from "../../constants/leaderboard";

export interface LeaderboardEntry {
  rank: number;
  username: string;
  value: number;
}

export interface LeaderboardStanding {
  rank: number;
  value: number;
  hidden: boolean;
}

// A GameSave counts as visible on other players' leaderboards unless its
// owner has explicitly opted out. `settings` is an optional 1:1 relation, so
// "no settings row yet" (a player who never touched Settings) must count as
// visible, not excluded.
const VISIBLE_FILTER: Prisma.GameSaveWhereInput = {
  user: { OR: [{ settings: null }, { settings: { hideFromLeaderboards: false } }] }
};

export async function getTopEntries(field: LeaderboardField, limit: number): Promise<LeaderboardEntry[]> {
  const rows = await prisma.gameSave.findMany({
    where: VISIBLE_FILTER,
    // Tie-break on userId so ties (e.g. two players both at 0) sort the same
    // way on every request instead of depending on incidental row order.
    orderBy: [{ [field]: "desc" }, { userId: "asc" }] as Prisma.GameSaveOrderByWithRelationInput[],
    take: limit,
    select: { [field]: true, user: { select: { username: true } } } as Prisma.GameSaveSelect
  });

  return (rows as unknown as Record<string, unknown>[]).map((row, index) => ({
    rank: index + 1,
    username: (row["user"] as { username: string }).username,
    value: row[field] as number
  }));
}

export async function getViewerStanding(
  field: LeaderboardField,
  userId: number
): Promise<LeaderboardStanding | null> {
  const own = await prisma.gameSave.findUnique({
    where: { userId },
    select: {
      [field]: true,
      user: { select: { settings: { select: { hideFromLeaderboards: true } } } }
    } as Prisma.GameSaveSelect
  });
  if (!own) return null;

  const row = own as unknown as Record<string, unknown>;
  const value = row[field] as number;
  const hidden =
    ((row["user"] as { settings: { hideFromLeaderboards: boolean } | null }).settings
      ?.hideFromLeaderboards ?? false) === true;

  // Rank = 1 + (players strictly ahead) + (players tied, but ordered before
  // this one by the same userId tie-break getTopEntries uses) — computed
  // among visible players only, regardless of whether the viewer themself is
  // hidden, so a hidden player still learns where they'd stand.
  const [greater, tiedBefore] = await Promise.all([
    prisma.gameSave.count({
      where: { ...VISIBLE_FILTER, [field]: { gt: value } } as Prisma.GameSaveWhereInput
    }),
    prisma.gameSave.count({
      where: {
        ...VISIBLE_FILTER,
        [field]: { equals: value },
        userId: { lt: userId }
      } as Prisma.GameSaveWhereInput
    })
  ]);

  return { rank: greater + tiedBefore + 1, value, hidden };
}
