import { expect, test } from "bun:test";
import { usernameField, withGeneratedUsername } from "./user";

test("email signup generates its server-owned username", () => {
    expect(usernameField.input).toBe(false);
    expect(usernameField.required).toBe(false);
    expect(withGeneratedUsername({ name: "Monstro Test" }).username).toBe("monstrotest");
    expect(withGeneratedUsername({ name: "Monstro Test", username: "oauth-user" }).username).toBe("oauth-user");
});
