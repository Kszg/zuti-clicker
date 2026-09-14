import { prisma } from "../prisma";
import { DEFAULT_SETTINGS } from "../../constants/settings";

export interface SettingsInput {
  theme?: string;
  language?: string;
  autosaveEnabled?: boolean;
  autosaveIntervalSecs?: number;
  prestigeCeremony?: string;
  hideFromLeaderboards?: boolean;
}

export const getSettings = async (userId: number) => {
  return prisma.userSettings.findUnique({ where: { userId } });
};

export const upsertSettings = async (userId: number, data: SettingsInput) => {
  // Partial update: only the keys the client actually sent are written, so a
  // client that knows nothing about a given setting cannot reset it to a default.
  const patch = {
    ...(data.theme !== undefined ? { theme: data.theme } : {}),
    ...(data.language !== undefined ? { language: data.language } : {}),
    ...(data.autosaveEnabled !== undefined ? { autosaveEnabled: data.autosaveEnabled } : {}),
    ...(data.autosaveIntervalSecs !== undefined
      ? { autosaveIntervalSecs: data.autosaveIntervalSecs }
      : {}),
    ...(data.prestigeCeremony !== undefined ? { prestigeCeremony: data.prestigeCeremony } : {}),
    ...(data.hideFromLeaderboards !== undefined
      ? { hideFromLeaderboards: data.hideFromLeaderboards }
      : {})
  };

  return prisma.userSettings.upsert({
    where: { userId },
    create: { userId, ...DEFAULT_SETTINGS, ...patch },
    update: patch
  });
};

export const deleteSettings = async (userId: number) => {
  return prisma.userSettings.deleteMany({ where: { userId } });
};
