import { expect, test } from "bun:test";
import { createSitePreset, storedSiteConfigFromStored } from "@/subtrees/site-config.js";
import { publishedAdsDestinations } from "./adsSiteDestinations";
import { mxSitelinkSpecs } from "./google";

function program(id: string, slug: string, name: string) {
  return {
    id,
    slug,
    name,
    description: `${name} classes`,
    visible: true,
    showLearnMore: true,
    detail: {
      title: name,
      ageRange: "4-6",
      previousRequirement: "None",
      description: `${name} classes`,
      challengeHeading: "Fit",
      challenges: ["Focus"],
    },
  };
}

function detailPage(id: string, path: string, programId: string, serviceLocationId?: string) {
  return {
    id,
    kind: "sections" as const,
    path,
    visible: true,
    ...(serviceLocationId ? { serviceLocationId } : {}),
    metadata: { title: id },
    sections: [{ id: `${id}-detail`, type: "program_detail" as const, visible: true, props: { programId } }],
  };
}

function publishedRevision() {
  const stored = storedSiteConfigFromStored(createSitePreset({
    preset: "scale", businessName: "AKA", tagline: "Train",
  }), "scale", [
    { locationId: "location-hammocks", isPrimary: true, displayOrder: 0 },
    { locationId: "location-west", isPrimary: false, displayOrder: 1 },
  ]);
  return {
    ...stored,
    content: {
      ...stored.content,
      programs: [
        program("legacy", "adult-mma", "Adult MMA"),
        program("dragon-hammocks", "little-dragon-hammocks", "Little Dragon"),
        program("dragon-west", "little-dragon-west", "Little Dragon West"),
      ],
    },
    pages: [
      ...stored.pages,
      detailPage("program-adult-mma", "/programs/adult-mma", "legacy"),
      detailPage("program-hammocks", "/hammocks/little-dragon-classes", "dragon-hammocks", "location-hammocks"),
      detailPage("program-west", "/west-kendall/little-dragon-classes", "dragon-west", "location-west"),
    ],
  };
}

test("uses resolved published page paths and only this location's pinned programs", () => {
  const destinations = publishedAdsDestinations(publishedRevision(), "scale", "location-hammocks");
  expect(destinations.programs).toEqual([
    { name: "Adult MMA", path: "/programs/adult-mma" },
    { name: "Little Dragon", path: "/hammocks/little-dragon-classes" },
  ]);

  const links = mxSitelinkSpecs("https://aka.example.com", destinations.pages, destinations.programs);
  expect(links.map((link) => link.url)).toContain("https://aka.example.com/hammocks/little-dragon-classes");
  expect(links.map((link) => link.url).some((url) => url.includes("/programs/little-dragon"))).toBe(false);

  expect(publishedAdsDestinations(publishedRevision(), "scale", "location-west").programs)
    .toEqual([
      { name: "Adult MMA", path: "/programs/adult-mma" },
      { name: "Little Dragon West", path: "/west-kendall/little-dragon-classes" },
    ]);
});
