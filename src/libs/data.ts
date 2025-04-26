import { CustomVariableGroup } from "@/types"

const CountryCodes = [
    { name: "Canada", code: "CA", shortName: "CAD" },
    { name: 'United States', code: "US", shortName: "USA" },
    { name: "United Kingdom", code: "UK", shortName: "GB" },
    { name: "Australia", code: "AU", shortName: "AUS" }
]

const MonstroData = {
    fullAddress: '7901 4th ST N STE 300 St Petersburg, FL 33702, USA',
    phone: '123-456-7890',
    email: 'stevey@simplygrowonline.com',
    name: 'John Doe',
    url: 'https://mymonstro.com',
    privacyUrl: 'https://mymonstro.com/legal/privacy-policy',
    termsUrl: 'https://mymonstro.com/legal/terms-of-service',
    supportUrl: 'https://mymonstro.com/support',
    unsubscribeUrl: 'https://mymonstro.com/unsubscribe',
    logoUrl: 'https://mymonstro.com/logo.png',
}

const PaymentMethods: string[] = [
    "card",
    "cash",
    "zelle",
    "bank payment",
    "cheque"
]

const TimeZones = [
    "GMT-04:00 America/New_York (EDT)",
    "GMT-05:00 America/Chicago (CDT)",
    "GMT-06:00 America/Denver (MDT)",
    "GMT-07:00 America/Los_Angeles (PDT)",
    "GMT-08:00 America/Anchorage (AKDT)",
    "GMT-09:00 America/Adak (HDT)",
    "GMT-10:00 Pacific/Honolulu (HST)"
]

const Regions = {
    us: {
        regions: [
            "Alabama",
            "Alaska",
            "Arizona",
            "Arkansas",
            "California",
            "Colorado",
            "Connecticut",
            "Delaware",
            "Florida",
            "Georgia",
            "Hawaii",
            "Idaho",
            "Illinois",
            "Indiana",
            "Iowa",
            "Kansas",
            "Kentucky",
            "Louisiana",
            "Maine",
            "Maryland",
            "Massachusetts",
            "Michigan",
            "Minnesota",
            "Mississippi",
            "Missouri",
            "Montana",
            "Nebraska",
            "Nevada",
            "New Hampshire",
            "New Jersey",
            "New Mexico",
            "New York",
            "North Carolina",
            "North Dakota",
            "Ohio",
            "Oklahoma",
            "Oregon",
            "Pennsylvania",
            "Rhode Island",
            "South Carolina",
            "South Dakota",
            "Tennessee",
            "Texas",
            "Utah",
            "Vermont",
            "Virginia",
            "Washington",
            "West Virginia",
            "Wisconsin",
            "Wyoming"
        ]
    },
    canada: {
        regions: [
            "Alberta",
            "British Columbia",
            "Manitoba",
            "New Brunswick",
            "Newfoundland and Labrador",
            "Nova Scotia",
            "Ontario",
            "Prince Edward Island",
            "Quebec",
            "Saskatchewan"
        ]
    }
}

const Industries = [
    "Martial Arts School",
    "Boxing Gym",
    "Fitness & Crossfit Gym",
    "Gymnastics Gym",
    "Dance Studio",
    "Swim School",
    "Music School",
    "Coding School",
    "Yoga Studio",
    "Pilates Studio",
    "Kickboxing Gym",
    "Sports Camp",
    "Cooking School",
    "Arts & Crafts School",
    "Tutoring",
    "Other"
]



const DEFAULT_VARIABLE_GROUPS: CustomVariableGroup[] = [

    {
        name: "Contact Information",
        variables: [
            { id: 1, label: 'First Name', value: 'prospect.firstName' },
            { id: 2, label: 'Last Name', value: 'prospect.lastName' },
            { id: 3, label: 'Full Name', value: 'prospect.fullName' },
            { id: 4, label: 'Email', value: 'prospect.email' },
            { id: 5, label: 'Phone', value: 'prospect.phone' }
        ]
    },
    {
        name: "Company Information",
        variables: [
            { id: 10, label: 'Location Name', value: 'location.name' },
            { id: 11, label: 'Location Address', value: 'location.address' },
            { id: 12, label: 'Location City', value: 'location.city' },
            { id: 13, label: 'Location State', value: 'location.state' },
            { id: 14, label: 'Location Postal Code', value: 'location.postalCode' },
            { id: 15, label: 'Location Email', value: 'location.email' },
            { id: 16, label: 'Location Phone', value: 'location.phone' },
        ]
    },
    {
        name: "User",
        variables: [
            { id: 22, label: 'User First Name', value: 'user.firstName' },
            { id: 23, label: 'User Last Name', value: 'user.lastName' },
            { id: 24, label: 'User Email', value: 'user.email' },
            { id: 25, label: 'User Phone', value: 'user.phone' },
        ]
    },
    {
        name: "Other",
        variables: [
            { id: 26, label: 'Bot Name', value: 'bot.name' }
        ]
    },
]

export {
    CountryCodes,
    Regions,
    TimeZones,
    Industries,
    MonstroData,
    PaymentMethods,
    DEFAULT_VARIABLE_GROUPS
}