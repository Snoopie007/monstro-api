import {
  Users,
  Medal,
  MessageSquare,
  AtSign,
  CalendarClock,
  Receipt,
  Settings,
  BookText,
  Home,
  FileText,
} from "lucide-react";

type SidebarMenuItem = {
    name: string
    path?: string
    icon: React.ReactNode
    subMenu?: SubMenuItem[]
}

type SubMenuItem = {
    name: string
    path: string
}

export const SidebarMenuItems: SidebarMenuItem[] = [
{
    name: "Dashboard",
    path: "",
    icon: <Home size={16} />,
},
{
    name: "Members",
    path: "members",
    icon: <Users size={16} />,
},
{
    name: 'Programs & Plans',
    icon: <BookText size={16} />,
    subMenu: [
        {
            name: 'Programs',
            path: 'programs',
        },
        {
            name: 'Subscriptions',
            path: 'products/subs',
        },
        {
            name: 'Packages',
            path: 'products/pkgs',
        },
        {
            name: 'Signed contracts',
            path: 'contracts',
        },
        {
            name: 'Contract Templates',
            path: 'contracts/templates',
        },
    ],
},
{
    name: "Groups & Community",
    path: 'groups',
    icon: <Users size={16} />,
},
{
    name: 'Achievements & Rewards',
    icon: <Medal size={16} />,
    subMenu: [
        {
            name: 'Achievements',
            path: 'achievements',
        },
        {
            name: 'Rewards',
            path: 'rewards',
        },
    ],
},
{
    name: 'Support',
    path: 'support',
    icon: <MessageSquare size={16} />,
},

{
    name: 'Staff',
    path: 'staffs',
    icon: <AtSign size={16} />,
},
{
    name: 'Calendar',
    path: 'calendar',
    icon: <CalendarClock size={16} />,
},
{
    name: 'Transactions',
    path: 'transactions',
    icon: <Receipt size={16} />,
},
{
    name: 'Invoices',
    icon: <FileText size={16} />,
    subMenu: [
        {
            name: 'Add Invoices',
            path: 'invoices/new',
        },
    ],
},

{
    name: 'Settings',
    path: 'settings/company',
    icon: <Settings size={16} />,
},
]
