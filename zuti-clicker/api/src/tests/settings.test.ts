import { describe, it, beforeAll, expect } from "@jest/globals";
import request from "supertest";
import { TestData } from "../constants/test-data.js";
import { Responses } from "../constants/responses.js";

const api = request(TestData.BASE_URL);

describe("Settings endpoints - unauthenticated", () => {
  it("GET /settings returns 401", async () => {
    const res = await api.get("/settings");
    expect(res.status).toBe(401);
    expect(res.body.error).toBe(Responses.AUTH.UNAUTHORIZED.body.error);
  });

  it("PUT /settings returns 401", async () => {
    const res = await api.put("/settings").send(TestData.VALID_SETTINGS);
    expect(res.status).toBe(401);
    expect(res.body.error).toBe(Responses.AUTH.UNAUTHORIZED.body.error);
  });
});

describe("Settings endpoints - authenticated", () => {
  let cookie: string;

  beforeAll(async () => {
    const user = TestData.generateUser();
    await api.post("/auth/register").send(user);
    const loginRes = await api
      .post("/auth/login")
      .send({ email: user.email, password: user.password });
    const rawHeader = (loginRes.headers["set-cookie"] as string[])[0];
    cookie = rawHeader.split(";")[0];
  });

  it("GET /settings returns the defaults when no row exists yet", async () => {
    const res = await api.get("/settings").set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.body.settings.theme).toBe(TestData.DEFAULT_SETTINGS_EXPECTED.theme);
    expect(res.body.settings.language).toBe(TestData.DEFAULT_SETTINGS_EXPECTED.language);
    expect(res.body.settings.autosaveEnabled).toBe(TestData.DEFAULT_SETTINGS_EXPECTED.autosaveEnabled);
    expect(res.body.settings.autosaveIntervalSecs).toBe(
      TestData.DEFAULT_SETTINGS_EXPECTED.autosaveIntervalSecs
    );
    expect(res.body.settings.prestigeCeremony).toBe(
      TestData.DEFAULT_SETTINGS_EXPECTED.prestigeCeremony
    );
    expect(res.body.settings.updatedAt).toBeNull();
  });

  it("PUT /settings persists a full valid payload", async () => {
    const res = await api.put("/settings").set("Cookie", cookie).send(TestData.VALID_SETTINGS);
    expect(res.status).toBe(200);
    expect(res.body.message).toBe(Responses.SETTINGS.UPDATE_SUCCESS.body.message);
    expect(res.body.settings.theme).toBe(TestData.VALID_SETTINGS.theme);
    expect(res.body.settings.language).toBe(TestData.VALID_SETTINGS.language);
    expect(res.body.settings.autosaveEnabled).toBe(TestData.VALID_SETTINGS.autosaveEnabled);
    expect(res.body.settings.autosaveIntervalSecs).toBe(
      TestData.VALID_SETTINGS.autosaveIntervalSecs
    );
    expect(res.body.settings.prestigeCeremony).toBe(TestData.VALID_SETTINGS.prestigeCeremony);
  });

  it("GET /settings returns the persisted values, with a string updatedAt", async () => {
    const res = await api.get("/settings").set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.body.settings.theme).toBe(TestData.VALID_SETTINGS.theme);
    expect(typeof res.body.settings.updatedAt).toBe("string");
  });

  it("PUT /settings applies a partial update, leaving other fields intact", async () => {
    const res = await api
      .put("/settings")
      .set("Cookie", cookie)
      .send(TestData.SETTINGS_PARTIAL);
    expect(res.status).toBe(200);
    expect(res.body.settings.theme).toBe("dark");

    const getRes = await api.get("/settings").set("Cookie", cookie);
    expect(getRes.body.settings.theme).toBe("dark");
    // Untouched by the partial update — still the values from VALID_SETTINGS.
    expect(getRes.body.settings.language).toBe(TestData.VALID_SETTINGS.language);
    expect(getRes.body.settings.autosaveIntervalSecs).toBe(
      TestData.VALID_SETTINGS.autosaveIntervalSecs
    );
  });

  it("PUT /settings rejects an invalid theme", async () => {
    const res = await api
      .put("/settings")
      .set("Cookie", cookie)
      .send(TestData.SETTINGS_INVALID_THEME);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe(Responses.SETTINGS.INVALID_THEME.body.error);
  });

  it("PUT /settings rejects an invalid language", async () => {
    const res = await api
      .put("/settings")
      .set("Cookie", cookie)
      .send(TestData.SETTINGS_INVALID_LANGUAGE);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe(Responses.SETTINGS.INVALID_LANGUAGE.body.error);
  });

  it("PUT /settings rejects an invalid prestigeCeremony", async () => {
    const res = await api
      .put("/settings")
      .set("Cookie", cookie)
      .send(TestData.SETTINGS_INVALID_CEREMONY);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe(Responses.SETTINGS.INVALID_CEREMONY.body.error);
  });

  it("PUT /settings rejects an autosaveIntervalSecs not in the allowed set", async () => {
    const res = await api
      .put("/settings")
      .set("Cookie", cookie)
      .send(TestData.SETTINGS_INVALID_INTERVAL);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe(Responses.SETTINGS.INVALID_AUTOSAVE_INTERVAL.body.error);
  });

  it("PUT /settings rejects a string autosaveIntervalSecs", async () => {
    const res = await api
      .put("/settings")
      .set("Cookie", cookie)
      .send(TestData.SETTINGS_STRING_INTERVAL);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe(Responses.SETTINGS.INVALID_AUTOSAVE_INTERVAL.body.error);
  });

  it("PUT /settings rejects a non-boolean autosaveEnabled", async () => {
    const res = await api
      .put("/settings")
      .set("Cookie", cookie)
      .send(TestData.SETTINGS_INVALID_ENABLED);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe(Responses.SETTINGS.INVALID_AUTOSAVE_ENABLED.body.error);
  });

  it("a mixed valid+invalid body writes nothing (validate-before-write atomicity)", async () => {
    const res = await api
      .put("/settings")
      .set("Cookie", cookie)
      .send(TestData.SETTINGS_MIXED_INVALID);
    expect(res.status).toBe(400);

    const getRes = await api.get("/settings").set("Cookie", cookie);
    // theme in the mixed body was "light", but the whole write must have been
    // rejected because language was invalid — theme must still be "dark".
    expect(getRes.body.settings.theme).toBe("dark");
  });

  it("unknown keys are ignored, not rejected", async () => {
    const res = await api
      .put("/settings")
      .set("Cookie", cookie)
      .send(TestData.SETTINGS_UNKNOWN_KEY);
    expect(res.status).toBe(200);

    const getRes = await api.get("/settings").set("Cookie", cookie);
    expect(getRes.body.settings.theme).toBe("dark");
  });

  it("an empty body is a no-op", async () => {
    const res = await api.put("/settings").set("Cookie", cookie).send({});
    expect(res.status).toBe(200);

    const getRes = await api.get("/settings").set("Cookie", cookie);
    expect(getRes.body.settings.theme).toBe("dark");
  });
});

describe("Settings endpoints - cross-device", () => {
  it("settings written from one session are visible from a second login as the same user", async () => {
    const user = TestData.generateUser();
    await api.post("/auth/register").send(user);

    const firstLogin = await api
      .post("/auth/login")
      .send({ email: user.email, password: user.password });
    const firstCookie = (firstLogin.headers["set-cookie"] as string[])[0].split(";")[0];

    await api.put("/settings").set("Cookie", firstCookie).send(TestData.VALID_SETTINGS);

    // Logging in again overwrites Authentication.sessionToken, so the first
    // cookie is now invalid — nothing after this point may reuse it.
    const secondLogin = await api
      .post("/auth/login")
      .send({ email: user.email, password: user.password });
    const secondCookie = (secondLogin.headers["set-cookie"] as string[])[0].split(";")[0];

    const res = await api.get("/settings").set("Cookie", secondCookie);
    expect(res.status).toBe(200);
    expect(res.body.settings.theme).toBe(TestData.VALID_SETTINGS.theme);
    expect(res.body.settings.prestigeCeremony).toBe(TestData.VALID_SETTINGS.prestigeCeremony);
  });
});
