function sanitizeHTML(html: string): string {
  const dangerousTags = [
    "script",
    "iframe",
    "object",
    "embed",
    "form",
    "input",
    "button",
    "link",
    "meta",
    "style",
    "base",
    "applet",
    "frame",
    "frameset",
  ];

  const dangerousAttributes = [
    "onload",
    "onerror",
    "onclick",
    "onmouseover",
    "onmouseout",
    "onkeydown",
    "onkeyup",
    "onchange",
    "onsubmit",
    "onfocus",
    "onblur",
    "javascript:",
    "vbscript:",
    "data:",
  ];

  let sanitized = html;

  dangerousTags.forEach((tag) => {
    const regex = new RegExp(`<${tag}[^>]*>.*?<\\/${tag}>`, "gsi");
    sanitized = sanitized.replace(regex, "");

    const selfClosingRegex = new RegExp(`<${tag}[^>]*\\/?>`, "gsi");
    sanitized = sanitized.replace(selfClosingRegex, "");
  });

  dangerousAttributes.forEach((attr) => {
    const regex = new RegExp(`\\s${attr}\\s*=\\s*["'][^"']*["']`, "gsi");
    sanitized = sanitized.replace(regex, "");

    const noQuoteRegex = new RegExp(`\\s${attr}\\s*=\\s*[^\\s>]+`, "gsi");
    sanitized = sanitized.replace(noQuoteRegex, "");
  });

  sanitized = sanitized.replace(
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gim,
    "",
  );

  sanitized = sanitized.replace(/<!--[\s\S]*?-->/g, "");

  sanitized = sanitized.replace(
    /\s(href|src)\s*=\s*["']javascript:[^"']*["']/gis,
    "",
  );
  sanitized = sanitized.replace(
    /\s(href|src)\s*=\s*["']vbscript:[^"']*["']/gis,
    "",
  );
  sanitized = sanitized.replace(
    /\s(href|src)\s*=\s*["']data:[^"']*["']/gis,
    "",
  );

  return sanitized;
}

function cleanupHTML(html: string): string {
  if (!html) return "";

  let cleaned = html;

  cleaned = cleaned.replace(/\s+/g, " ").trim();

  cleaned = cleaned.replace(/(\s*<\/section>\s*<h[1-6])/g, "$1");

  return cleaned;
}

export function interpolate(
  template: string,
  variables: Record<string, any>,
): string {
  if (!template) return "";

  const cleanedTemplate = cleanupHTML(template);
  const sanitizedTemplate = sanitizeHTML(cleanedTemplate);

  const output = sanitizedTemplate.replace(
    /<span[^>]*data-value="([^"]*)"[^>]*>@[^<]*<\/span>/g,
    (_, path) => {
      const value = path
        .split(".")
        .reduce(
          (obj: Record<string, any> | undefined, key: string) =>
            obj && typeof obj === "object" ? obj[key] : undefined,
          variables,
        );

      return value !== undefined ? String(value) : `@${path}`;
    },
  );

  return output.trim().replace(/\s+/g, " ");
}

export function interEmailsAndText(
  template: string,
  data: Record<string, any>,
): string {
  return template.replace(
    /\{\{([^}]+)\}\}/g,
    (match: string, p1: string): string => {
      const parts = p1.trim().split(".");

      const [path, style] = parts[parts.length - 1]?.split("|") ?? [];
      parts[parts.length - 1] = path ?? "";

      let value: Record<string, any> = data;
      for (const part of parts) {
        if (value === undefined || value === null) return match;
        value = value[part];
      }

      if (style && style.trim() === "lowercase") {
        return String(value ?? match).toLowerCase();
      }

      return String(value ?? match);
    },
  );
}

