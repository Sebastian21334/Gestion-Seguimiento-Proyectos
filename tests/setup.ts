process.env.DATABASE_URL = "postgresql://test:test@localhost/test";
process.env.APP_URL = "https://equipo.test";
process.env.ACS_CONNECTION_STRING =
  "endpoint=https://example.communication.azure.com/;accesskey=dGVzdA==";
process.env.ACS_SENDER_ADDRESS = "sender@example.test";
process.env.SESSION_SECRET = "session-test-secret-at-least-32-characters";
process.env.EMAIL_TOKEN_SECRET =
  "email-test-secret-distinct-at-least-32-characters";
process.env.ALLOWED_EMAIL_DOMAINS = "";
process.env.TRUST_PROXY = "false";
