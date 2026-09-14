import express from "express";
import { getTopEntries, getViewerStanding } from "../database/models/leaderboard";
import { Responses } from "../constants/responses";
import {
  LEADERBOARD_METRICS,
  DEFAULT_LEADERBOARD_METRIC,
  DEFAULT_LEADERBOARD_LIMIT,
  MAX_LEADERBOARD_LIMIT,
  isLeaderboardMetric
} from "../constants/leaderboard";

function parseLimit(raw: unknown): number | null {
  if (raw === undefined) return DEFAULT_LEADERBOARD_LIMIT;
  if (typeof raw !== "string" || !/^\d+$/.test(raw)) return null;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > MAX_LEADERBOARD_LIMIT) return null;
  return n;
}

/**
 * @openapi
 * /leaderboard:
 *   get:
 *     tags:
 *       - Leaderboard
 *     summary: Get a ranked leaderboard for one lifetime stat
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: metric
 *         schema:
 *           type: string
 *           enum: [tokens, clicks, phd, playtime]
 *           default: tokens
 *         description: Which lifetime stat to rank by
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *         description: How many top entries to return
 *     responses:
 *       '200':
 *         description: Ranked entries plus the current user's own standing
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LeaderboardResponse'
 *       '400':
 *         description: Invalid metric or limit
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '401':
 *         $ref: '#/components/responses/Unauthorized'
 *       '500':
 *         $ref: '#/components/responses/InternalError'
 */
export const getLeaderboard = async (req: express.Request, res: express.Response) => {
  try {
    const userId = req.identity?.id;
    if (userId === undefined) {
      const r = Responses.AUTH.UNAUTHORIZED;
      res.status(r.status).json(r.body);
      return;
    }

    const metricParam = req.query["metric"];
    const metric = metricParam === undefined ? DEFAULT_LEADERBOARD_METRIC : metricParam;
    if (!isLeaderboardMetric(metric)) {
      const r = Responses.LEADERBOARD.INVALID_METRIC;
      res.status(r.status).json(r.body);
      return;
    }

    const limit = parseLimit(req.query["limit"]);
    if (limit === null) {
      const r = Responses.LEADERBOARD.INVALID_LIMIT;
      res.status(r.status).json(r.body);
      return;
    }

    const field = LEADERBOARD_METRICS[metric].field;
    const [entries, viewer] = await Promise.all([
      getTopEntries(field, limit),
      getViewerStanding(field, userId)
    ]);

    res.status(200).json({ metric, entries, viewer });
  } catch (error) {
    console.error("Get leaderboard error:", error);
    const r = Responses.LEADERBOARD.INTERNAL_ERROR;
    res.status(r.status).json(r.body);
  }
};
