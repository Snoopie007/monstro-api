

type SettingMenuItem = {
    name: string;
    path: string;
    roles: string[];
}

export const SettingMenuItems: SettingMenuItem[] = [
    { path: "company", name: "Business Info", roles: ['vendor', 'admin'] },
    { path: 'roles', name: "Roles", roles: ['vendor'] },
    { path: "billing", name: "Billing", roles: ['vendor'] },
    { path: "invoices", name: "Invoices", roles: ['vendor'] },
    { path: "benefits", name: "Benefits", roles: ['vendor'] },
    { path: "integrations", name: "Integrations", roles: ['vendor', 'admin'] }
    { path: "password", name: "Password", roles: ['vendor', 'admin'] }
];