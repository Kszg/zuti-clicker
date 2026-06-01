export class Responses {
  static readonly AUTH = {
    MISSING_REGISTER_FIELDS: {
      status: 400,
      body: { error: "The username, email, and password fields are required." }
    },
    MISSING_LOGIN_FIELDS: { status: 400, body: { error: "Email and password are required." } },
    EMAIL_EXISTS: { status: 409, body: { error: "A user with that email already exists." } },
    USERNAME_EXISTS: { status: 409, body: { error: "A user with that username already exists." } },
    INVALID_CREDENTIALS: { status: 401, body: { error: "Invalid credentials." } },
    UNAUTHORIZED: { status: 401, body: { error: "Unauthorized." } },
    INTERNAL_ERROR: { status: 500, body: { error: "Internal server error." } },
    REGISTER_SUCCESS: { status: 201, body: { message: "User registered successfully." } },
    LOGIN_SUCCESS: { status: 200, body: { message: "Login successful." } }
  } as const;
}
