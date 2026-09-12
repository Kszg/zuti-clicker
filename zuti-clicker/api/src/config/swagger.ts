import swaggerJsdoc from "swagger-jsdoc";
import { fileURLToPath } from "url";
import path from "path";
import { THEMES, LANGUAGES, PRESTIGE_CEREMONIES, AUTOSAVE_INTERVALS } from "../constants/settings";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Called after dotenv.config() so that IP/PORT env vars are resolved at
 * invocation time rather than at module evaluation time.
 */
export const buildSwaggerSpec = (): object => {
  const options: swaggerJsdoc.Options = {
    definition: {
      openapi: "3.1.0",
      info: {
        title: "Zuti Clicker API",
        version: "1.0.0",
        description: "REST API for the Zuti Clicker game."
      },
      servers: [
        {
          url: `http://${process.env.IP ?? "localhost"}:${process.env.PORT ?? "3000"}`
        }
      ],
      components: {
        securitySchemes: {
          cookieAuth: {
            type: "apiKey",
            in: "cookie",
            name: "AUTH_TOKEN",
            description:
              "Session token issued on a successful `/login` call. " +
              "Set automatically via `Set-Cookie`; pass it manually when using the Try-it-out panel."
          }
        },
        schemas: {
          RegisterRequest: {
            type: "object",
            required: ["username", "email", "password"],
            properties: {
              username: { type: "string", example: "johndoe" },
              email: { type: "string", format: "email", example: "john@example.com" },
              password: { type: "string", format: "password", example: "s3cur3P@ssw0rd" }
            }
          },
          LoginRequest: {
            type: "object",
            required: ["email", "password"],
            properties: {
              email: { type: "string", format: "email", example: "john@example.com" },
              password: { type: "string", format: "password", example: "s3cur3P@ssw0rd" }
            }
          },
          ErrorResponse: {
            type: "object",
            properties: {
              error: { type: "string" }
            }
          },
          MessageResponse: {
            type: "object",
            properties: {
              message: { type: "string" }
            }
          },
          UnitSave: {
            type: "object",
            required: ["unitId", "owned"],
            properties: {
              unitId: { type: "string", example: "alpha" },
              owned: { type: "integer", minimum: 0, example: 5 }
            }
          },
          StoreSaveRequest: {
            type: "object",
            // Only the original five are required — the prestige fields are
            // optional so a client that predates prestige keeps working.
            required: [
              "tokens",
              "totalTokensEarned",
              "totalClicks",
              "elapsedSeconds",
              "units"
            ],
            properties: {
              tokens: {
                type: "number",
                description: "Current token balance",
                example: 1234.56
              },
              totalTokensEarned: {
                type: "number",
                description: "All-time tokens earned",
                example: 9999.99
              },
              totalClicks: {
                type: "integer",
                description: "Total manual clicks",
                example: 420
              },
              elapsedSeconds: {
                type: "number",
                description: "Total time played in seconds",
                example: 3600.5
              },
              phdCount: {
                type: "integer",
                minimum: 0,
                description: "PhDs earned across all prestiges (omit to keep the stored value)",
                example: 3
              },
              prestigeCount: {
                type: "integer",
                minimum: 0,
                description: "Number of times the player has prestiged (omit to keep the stored value)",
                example: 2
              },
              runTokensEarned: {
                type: "number",
                minimum: 0,
                description: "Tokens earned in the current run (reset on prestige; omit to keep the stored value)",
                example: 4000000
              },
              runClicks: {
                type: "integer",
                minimum: 0,
                description: "Manual clicks in the current run (omit to keep the stored value)",
                example: 40
              },
              runSeconds: {
                type: "number",
                minimum: 0,
                description: "Time played in the current run, in seconds (omit to keep the stored value)",
                example: 1200
              },
              units: {
                type: "array",
                items: { $ref: "#/components/schemas/UnitSave" }
              }
            }
          },
          SaveData: {
            type: "object",
            properties: {
              tokens: { type: "number", example: 1234.56 },
              totalTokensEarned: { type: "number", example: 9999.99 },
              totalClicks: { type: "integer", example: 420 },
              elapsedSeconds: { type: "number", example: 3600.5 },
              phdCount: { type: "integer", example: 3 },
              prestigeCount: { type: "integer", example: 2 },
              runTokensEarned: { type: "number", example: 4000000 },
              runClicks: { type: "integer", example: 40 },
              runSeconds: { type: "number", example: 1200 },
              savedAt: { type: "string", format: "date-time" },
              units: {
                type: "array",
                items: { $ref: "#/components/schemas/UnitSave" }
              }
            }
          },
          UserSettings: {
            type: "object",
            properties: {
              theme: { type: "string", enum: [...THEMES], example: "dark" },
              language: { type: "string", enum: [...LANGUAGES], example: "en" },
              autosaveEnabled: { type: "boolean", example: true },
              autosaveIntervalSecs: {
                type: "integer",
                enum: [...AUTOSAVE_INTERVALS],
                example: 30
              },
              prestigeCeremony: { type: "string", enum: [...PRESTIGE_CEREMONIES], example: "full" },
              updatedAt: {
                type: ["string", "null"],
                format: "date-time",
                description: "null when the user has never saved settings (defaults are in effect)"
              }
            }
          },
          UpdateSettingsRequest: {
            type: "object",
            description: "All fields optional — a partial update leaves omitted fields unchanged",
            properties: {
              theme: { type: "string", enum: [...THEMES] },
              language: { type: "string", enum: [...LANGUAGES] },
              autosaveEnabled: { type: "boolean" },
              autosaveIntervalSecs: { type: "integer", enum: [...AUTOSAVE_INTERVALS] },
              prestigeCeremony: { type: "string", enum: [...PRESTIGE_CEREMONIES] }
            }
          },
          SettingsResponse: {
            type: "object",
            properties: {
              settings: { $ref: "#/components/schemas/UserSettings" }
            }
          },
          LoadSaveResponse: {
            type: "object",
            properties: {
              save: {
                oneOf: [
                  { $ref: "#/components/schemas/SaveData" },
                  { type: "null" }
                ],
                description: "null when the user has no save yet"
              }
            }
          },
          StoreSaveResponse: {
            allOf: [
              { $ref: "#/components/schemas/MessageResponse" },
              {
                type: "object",
                properties: {
                  savedAt: { type: "string", format: "date-time" }
                }
              }
            ]
          }
        },
        responses: {
          Unauthorized: {
            description: "Missing or invalid session token",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                example: { error: "Unauthorized." }
              }
            }
          },
          InternalError: {
            description: "Internal server error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                example: { error: "Internal server error." }
              }
            }
          }
        }
      }
    },
    // Scans these files for @openapi JSDoc blocks at startup
    apis: [path.join(__dirname, "../controllers/*.ts")]
  };

  return swaggerJsdoc(options);
};
