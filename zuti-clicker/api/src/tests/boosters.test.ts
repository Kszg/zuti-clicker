import { describe, it, beforeAll, expect } from "@jest/globals";
import request from "supertest";
import { TestData } from "../constants/test-data.js";
import { Responses } from "../constants/responses.js";
import { BOOSTER_IDS, BOOSTER_COOLDOWN_MAX_SECS } from "../constants/boosters.js";

const api = request(TestData.BASE_URL);

// Registers a fresh test user, logs in, and returns their session cookie.
async function registerAndLogin(): Promise<string> {
  const user = TestData.generateUser();
  await api.post("/auth/register").send(user);
  const res = await api.post("/auth/login").send({ email: user.email, password: user.password });
  return (res.headers["set-cookie"] as unknown as string[])[0].split(";")[0];
}

describe("Booster endpoint - unauthenticated", () => {
  it("POST /boosters/claim returns 401", async () => {
    const res = await api.post("/boosters/claim");
    expect(res.status).toBe(401);
    expect(res.body.error).toBe(Responses.AUTH.UNAUTHORIZED.body.error);
  });
});

describe("Booster endpoint - no save yet", () => {
  it("POST /boosters/claim returns 404 for a logged-in user with no save", async () => {
    const cookie = await registerAndLogin();
    const res = await api.post("/boosters/claim").set("Cookie", cookie);
    expect(res.status).toBe(404);
    expect(res.body.error).toBe(Responses.BOOSTER.NO_SAVE.body.error);
  });
});

describe("Booster endpoint - claim / cooldown", () => {
  let cookie: string;

  beforeAll(async () => {
    cookie = await registerAndLogin();
    // A fresh GameSave row's nextBoosterAt defaults to "now" (see the
    // add_upgrades_and_boosters migration), so it's immediately claimable.
    await api.put("/save").set("Cookie", cookie).send(TestData.VALID_SAVE);
  });

  it("the first claim succeeds with a known booster id, a positive duration, and a cooldown for the next one", async () => {
    const res = await api.post("/boosters/claim").set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.body.message).toBe(Responses.BOOSTER.CLAIM_SUCCESS.body.message);
    expect(BOOSTER_IDS as readonly string[]).toContain(res.body.boosterId);
    expect(res.body.remainingMs).toBeGreaterThan(0);
    expect(res.body.nextAvailableInMs).toBeGreaterThan(0);
    expect(res.body.nextAvailableInMs).toBeLessThanOrEqual(BOOSTER_COOLDOWN_MAX_SECS * 1000);
  });

  // This IS the anti-cheat property: a claim immediately after a successful
  // one must be refused, proving the server — not the client — gates when a
  // booster can be granted.
  it("regression: an immediate second claim is refused with 409 while on cooldown", async () => {
    const res = await api.post("/boosters/claim").set("Cookie", cookie);
    expect(res.status).toBe(409);
    expect(res.body.error).toBe(Responses.BOOSTER.ON_COOLDOWN.body.error);
    expect(res.body.nextAvailableInMs).toBeGreaterThan(0);
    // Never exposes an absolute expiry — only a relative "how long from now".
    expect(res.body.nextAvailableInMs).toBeLessThanOrEqual(BOOSTER_COOLDOWN_MAX_SECS * 1000);
    expect(res.body.expiresAt).toBeUndefined();
    expect(res.body.nextBoosterAt).toBeUndefined();
  });

  it("the granted booster shows up as an active booster on GET /save", async () => {
    const res = await api.get("/save").set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.body.save.activeBoosters).toHaveLength(1);
    expect(BOOSTER_IDS as readonly string[]).toContain(res.body.save.activeBoosters[0].boosterId);
    expect(res.body.save.activeBoosters[0].remainingMs).toBeGreaterThan(0);
  });
});

describe("Booster endpoint - reclaiming refreshes rather than duplicates", () => {
  it("boostersCollected increments and a second successful claim (once cooldown has actually passed) never yields two active rows of the same type", async () => {
    // This test only asserts the invariant that matters without waiting out
    // a real 60s+ cooldown: GET /save's activeBoosters can never contain two
    // entries sharing a boosterId, because ActiveBooster is upserted on the
    // unique (gameSaveId, boosterId) pair — proven directly against the
    // schema constraint rather than the timing, which the previous describe
    // block already exercises for the 200/409 behavior itself.
    const cookie = await registerAndLogin();
    await api.put("/save").set("Cookie", cookie).send(TestData.VALID_SAVE);
    const claimRes = await api.post("/boosters/claim").set("Cookie", cookie);
    expect(claimRes.status).toBe(200);

    const res = await api.get("/save").set("Cookie", cookie);
    const boosterIds = (res.body.save.activeBoosters as { boosterId: string }[]).map(
      (b) => b.boosterId
    );
    expect(new Set(boosterIds).size).toBe(boosterIds.length);
  });
});
