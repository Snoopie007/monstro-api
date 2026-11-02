/** What a box on an uploaded PDF template holds. Data values are filled in when the document is created, and the
 * signer adds the `signing.*` ones. */
export const FIELD_SOURCES = [
	"member.name", "member.firstName", "member.lastName", "member.email", "member.phone", "member.dob",
	"location.name", "location.legalName", "location.address", "location.city", "location.state", "location.postalCode",
	"location.phone", "location.email", "plan.name", "plan.pricingName", "plan.price", "plan.interval",
	"signing.signature", "signing.signerName", "signing.date", "signing.text",
] as const;
export type FieldSource = typeof FIELD_SOURCES[number];

/** A box on an uploaded PDF template. Coordinates are PDF points on a 0-based page, origin at the bottom left. */
export type TemplateField = {
	id: string;
	page: number;
	x: number;
	y: number;
	width: number;
	height: number;
	source: FieldSource;
	label?: string;
};
