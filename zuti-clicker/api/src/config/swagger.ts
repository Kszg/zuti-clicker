import swaggerJsdoc from "swagger-jsdoc";
import { fileURLToPath } from "url";
import path from "path";

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
          }
        }
      }
    },
    // Scans these files for @openapi JSDoc blocks at startup
    apis: [path.join(__dirname, "../controllers/*.ts")]
  };

  return swaggerJsdoc(options);
};
