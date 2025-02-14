
export type VendorLevel = {
    [key: string]: string | number;
    level: string;
    icon: string;
    min: number;
    max: number;
}

export const VendorLevels: VendorLevel[] = [
    {
        level: "Baby",
        icon: "one.png",
        min: 0,
        max: 1000,
    },
    {
        level: "Teen",
        icon: "two.png",
        min: 1001,
        max: 3000,
    },
    {
        level: "Adult",
        icon: "three.png",
        min: 3001,
        max: 5000,
    }
]

export type AchivementBadge = {
    id: number;
    name: string;
    description: string;
    icon: string;
    type: "count" | "actions"; // This is already correct - type is already set to be either "count" or "actions"
    points: number;
    requiredCount?: number;
    requiredActions?: string[];
}

export const badges: AchivementBadge[] = [
    {
        id: 1,
        name: "Benefit 1",
        icon: "beardummy.png",
        description: "Earn this achievement by completing 10 messages.",
        type: "count",
        requiredCount: 100,

        points: 100,

    },
    {
        id: 2,
        name: "Benefit 2",
        icon: "beardummy.png",
        description: "Description 2",
        type: "count",
        requiredCount: 100,
        points: 100,
    }
]

