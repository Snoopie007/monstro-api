import { VariableGroup } from "./types";


export const VariableGroups: VariableGroup[] = [
    {
        name: "Contact Information",
        variables: [
            { id: 1, label: 'First Name', value: 'contact.firstName' },
            { id: 2, label: 'Last Name', value: 'contact.lastName' },
            { id: 3, label: 'Full Name', value: 'contact.fullName' },
            { id: 4, label: 'Email', value: 'contact.email' },
            { id: 5, label: 'Phone', value: 'contact.phone' },
            { id: 6, label: 'Address', value: 'contact.address' },
            { id: 7, label: 'City', value: 'contact.city' },
            { id: 8, label: 'State', value: 'contact.state' },
            { id: 9, label: 'Zip', value: 'contact.zip' },
        ]
    },
    {
        name: "Company Information",
        variables: [
            { id: 10, label: 'Company Name', value: 'company.name' },
            { id: 11, label: 'Company Address', value: 'company.address' },
            { id: 12, label: 'Company City', value: 'company.city' },
            { id: 13, label: 'Company State', value: 'company.state' },
            { id: 14, label: 'Company Zip', value: 'company.zip' },
            { id: 15, label: 'Company Email', value: 'company.email' },
            { id: 16, label: 'Company Phone', value: 'company.phone' },
        ]
    },
    {
        name: "Plan Information",
        variables: [
            { id: 17, label: 'Plan Name', value: 'plan.name' },
            { id: 18, label: 'Plan Description', value: 'plan.description' },
            { id: 19, label: 'Plan Price', value: 'plan.price' },
            { id: 20, label: 'Plan Period', value: 'plan.period' },
            { id: 21, label: 'Plan No Of Family Members', value: 'plan.familyMemberLimit' }
        ]
    },
    {
        name: "Program Information",
        variables: [
            { id: 22, label: 'Program Name', value: 'program.name' },
            { id: 23, label: 'Program Description', value: 'program.description' }
        ]
    }
]