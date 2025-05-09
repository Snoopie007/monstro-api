import { icons } from "lucide-react";

type SidebarMenuItem = {
    name: string;
    path?: string;
    icon: keyof typeof icons;
    subMenu?: SubMenuItem[];
}

type SubMenuItem = {
    name: string;
    path: string;
}

export const SidebarMenuItems: SidebarMenuItem[] = [
    {
        name: "Members",
        path: "members",
        icon: "Users"
    },
    {
        name: "Programs & Plans",
        icon: "BookText",
        subMenu: [
            {
                name: "Programs",
                path: 'programs',

            },
            {
                name: "Subscriptions",
                path: "products/subs",
            },
            {
                name: "Packages",
                path: "products/pkgs",
            },
            {
                name: "Signed contracts",
                path: "contracts",
            },
            {
                name: "Contract Templates",
                path: "contracts/templates",
            }

        ]
    },
    {
        name: "Achievements & Rewards",
        icon: "Medal",
        subMenu: [
            {
                name: "Achievements",
                path: "achievements",
            },
            {
                name: "Rewards",
                path: "rewards",
            }
        ]
    },
    {
        name: "AI",
        path: "ai",
        icon: "Bot"
    },

    {
        name: "Staff",
        path: "staffs",
        icon: "AtSign"
    },
    {
        name: "Calendar",
        path: "calendar",
        icon: "CalendarClock"
    },
    {
        name: "Transactions",
        path: "transactions",
        icon: "Receipt"
    },
    {
        name: "Reporting",
        path: "reporting",
        icon: "SquareChartGantt"
    },

    {
        name: "Settings",
        path: "settings/company",
        icon: "Settings"
    }
]