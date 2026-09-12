import express from "express";
import { getSettings, upsertSettings } from "../database/models/userSettings";
import { Responses } from "../constants/responses";
import {
  THEMES,
  LANGUAGES,
  PRESTIGE_CEREMONIES,
  AUTOSAVE_INTERVALS,
  DEFAULT_SETTINGS
} from "../constants/settings";

interface SettingsBody {
  theme?: unknown;
  language?: unknown;
  autosaveEnabled?: unknown;
  autosaveIntervalSecs?: unknown;
  prestigeCeremony?: unknown;
}

function isAbsentOrOneOf(value: unknown, allowed: readonly string[]): boolean {
  return value === undefined || (typeof value === "string" && allowed.includes(value));
}

/**
 * @openapi
 * /settings:
 *   get:
 *     tags:
 *       - Settings
 *     summary: Load the current user's settings (defaults if none saved yet)
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       '200':
 *         description: The user's settings, or the defaults if none have been saved yet
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SettingsResponse'
 *       '401':
 *         $ref: '#/components/responses/Unauthorized'
 *       '500':
 *         $ref: '#/components/responses/InternalError'
 */
export const loadSettings = async (req: express.Request, res: express.Response) => {
  try {
    const userId = req.identity?.id;
    if (userId === undefined) {
      const r = Responses.AUTH.UNAUTHORIZED;
      res.status(r.status).json(r.body);
      return;
    }

    const row = await getSettings(userId);

    res.status(200).json({
      settings: row
        ? {
            theme: row.theme,
            language: row.language,
            autosaveEnabled: row.autosaveEnabled,
            autosaveIntervalSecs: row.autosaveIntervalSecs,
            prestigeCeremony: row.prestigeCeremony,
            updatedAt: row.updatedAt
          }
        : { ...DEFAULT_SETTINGS, updatedAt: null }
    });
  } catch (error) {
    console.error("Load settings error:", error);
    const r = Responses.SETTINGS.INTERNAL_ERROR;
    res.status(r.status).json(r.body);
  }
};

/**
 * @openapi
 * /settings:
 *   put:
 *     tags:
 *       - Settings
 *     summary: Update the current user's settings (partial — omitted fields are left unchanged)
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateSettingsRequest'
 *     responses:
 *       '200':
 *         description: Settings updated; the full effective settings are returned
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SettingsResponse'
 *       '400':
 *         description: A present field failed validation (nothing is written if any field is invalid)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '401':
 *         $ref: '#/components/responses/Unauthorized'
 *       '500':
 *         $ref: '#/components/responses/InternalError'
 */
export const storeSettings = async (req: express.Request, res: express.Response) => {
  try {
    const userId = req.identity?.id;
    if (userId === undefined) {
      const r = Responses.AUTH.UNAUTHORIZED;
      res.status(r.status).json(r.body);
      return;
    }

    const { theme, language, autosaveEnabled, autosaveIntervalSecs, prestigeCeremony } =
      req.body as SettingsBody;

    // Validate everything before writing anything, so a partially-invalid
    // body never partially applies.
    if (!isAbsentOrOneOf(theme, THEMES)) {
      const r = Responses.SETTINGS.INVALID_THEME;
      res.status(r.status).json(r.body);
      return;
    }
    if (!isAbsentOrOneOf(language, LANGUAGES)) {
      const r = Responses.SETTINGS.INVALID_LANGUAGE;
      res.status(r.status).json(r.body);
      return;
    }
    if (!isAbsentOrOneOf(prestigeCeremony, PRESTIGE_CEREMONIES)) {
      const r = Responses.SETTINGS.INVALID_CEREMONY;
      res.status(r.status).json(r.body);
      return;
    }
    if (autosaveEnabled !== undefined && typeof autosaveEnabled !== "boolean") {
      const r = Responses.SETTINGS.INVALID_AUTOSAVE_ENABLED;
      res.status(r.status).json(r.body);
      return;
    }
    // `.includes` also rejects a non-number (e.g. a stringified "30") since it
    // never matches any entry in AUTOSAVE_INTERVALS.
    if (
      autosaveIntervalSecs !== undefined &&
      !(AUTOSAVE_INTERVALS as readonly unknown[]).includes(autosaveIntervalSecs)
    ) {
      const r = Responses.SETTINGS.INVALID_AUTOSAVE_INTERVAL;
      res.status(r.status).json(r.body);
      return;
    }

    // Unknown keys are silently ignored (forward-compat: a newer client must
    // not break against an older API).
    const row = await upsertSettings(userId, {
      theme: theme as string | undefined,
      language: language as string | undefined,
      autosaveEnabled: autosaveEnabled as boolean | undefined,
      autosaveIntervalSecs: autosaveIntervalSecs as number | undefined,
      prestigeCeremony: prestigeCeremony as string | undefined
    });

    const r = Responses.SETTINGS.UPDATE_SUCCESS;
    res.status(r.status).json({
      ...r.body,
      settings: {
        theme: row.theme,
        language: row.language,
        autosaveEnabled: row.autosaveEnabled,
        autosaveIntervalSecs: row.autosaveIntervalSecs,
        prestigeCeremony: row.prestigeCeremony,
        updatedAt: row.updatedAt
      }
    });
  } catch (error) {
    console.error("Store settings error:", error);
    const r = Responses.SETTINGS.INTERNAL_ERROR;
    res.status(r.status).json(r.body);
  }
};
