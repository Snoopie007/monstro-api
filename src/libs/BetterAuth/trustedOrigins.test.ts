import { expect, mock, test } from "bun:test";

mock.module("@/db/db", () => ({ db: {} }));

test("allows tenant localhost origins outside production", async () => {
  const { resolveTrustedOrigins } = await import("./trustedOrigins");
  const previous = Bun.env.BUN_ENV;
  Bun.env.BUN_ENV = "development";
  try {
    const origin = "http://zr-team.localhost:3111";
    const origins = await resolveTrustedOrigins(
      "http://localhost:3000",
      new Request("http://localhost:3000/web/auth/sign-in/social", {
        headers: { origin },
      }),
    );
    expect(origins).toContain(origin);
  } finally {
    if (previous === undefined) delete Bun.env.BUN_ENV;
    else Bun.env.BUN_ENV = previous;
  }
});
