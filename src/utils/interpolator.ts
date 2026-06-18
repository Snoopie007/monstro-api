

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

