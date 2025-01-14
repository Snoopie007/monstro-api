

type SettingMenuItem = {
    name: string;
    path: string;
}

export const SettingMenuItems: SettingMenuItem[] = [

    { path: "company", name: "Business Info" },
    { path: 'roles', name: "Roles" },
    { path: "billing", name: "Billing" },
    { path: "invoices", name: "Invoices" },
    { path: "integrations", name: "Integrations" },
    { path: "password", name: "Password" }
];