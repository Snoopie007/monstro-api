import { db } from "@/db/db";
import { eq } from "drizzle-orm";
import { locations, botTemplates, aiPersona, documents } from "@/db/schemas";
import { Location } from "@/types/location";
import { BotTemplate, AIPersona, Document } from "@/types/bots";

export interface BotsPageData {
  location: Location;
  templates: BotTemplate[];
  personas: AIPersona[];
  docs: Document[];
}

/**
 * Fetches all data needed for the bots page
 */
export async function getBotsPageData(locationId: string): Promise<BotsPageData> {
  // Fetch location data
  const location = await db.query.locations.findFirst({
    where: (locations, { eq }) => eq(locations.id, locationId),
  });

  if (!location) {
    throw new Error("Location not found");
  }

  // Fetch bot templates, personas, and documents in parallel
  const [templates, personas, docs] = await Promise.all([
    db.query.botTemplates.findMany(),
    db.query.aiPersona.findMany({
      where: (persona, { eq }) => eq(persona.locationId, locationId)
    }),
    db.query.documents.findMany({
      where: (doc, { eq }) => eq(doc.locationId, locationId)
    })
  ]);

  return {
    location,
    templates,
    personas,
    docs
  };
}

/**
 * Validates if a location exists
 */
export async function validateLocation(locationId: string): Promise<Location> {
  const location = await db.query.locations.findFirst({
    where: (locations, { eq }) => eq(locations.id, locationId),
  });

  if (!location) {
    throw new Error("Location not found");
  }

  return location;
}

/**
 * Fetches bot templates
 */
export async function getBotTemplates(): Promise<BotTemplate[]> {
  return await db.query.botTemplates.findMany();
}

/**
 * Fetches personas for a specific location
 */
export async function getLocationPersonas(locationId: string): Promise<AIPersona[]> {
  return await db.query.aiPersona.findMany({
    where: (persona, { eq }) => eq(persona.locationId, locationId)
  });
}

/**
 * Fetches documents for a specific location
 */
export async function getLocationDocuments(locationId: string): Promise<Document[]> {
  return await db.query.documents.findMany({
    where: (doc, { eq }) => eq(doc.locationId, locationId)
  });
}