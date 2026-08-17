import { expect, test } from "bun:test";
import { EmailTemplates } from "@subtrees/emails";

test("registers vendor member welcome templates", () => {
    expect(EmailTemplates).toHaveProperty("MemberWelcomeNewAccountEmail");
    expect(EmailTemplates).toHaveProperty("MemberWelcomeExistingAccountEmail");
});
