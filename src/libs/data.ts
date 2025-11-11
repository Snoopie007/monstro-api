import { LocationSettings } from "@/types";
const DEFAULT_LOCATION_SETTINGS: LocationSettings = {
    theme: 'default',
    passOnFees: false,
    processingMethods: ["card"],
}

const AchievementTriggers = [
    { id: 1, name: "Attendances Count" },
    { id: 2, name: "Referrals Count" },
    { id: 3, name: "Plan Signup" },
    { id: 4, name: "Amount Spent" }
]

const CountryCodes = [
    { name: "Canada", code: "CA", shortName: "CAD" },
    { name: 'United States', code: "US", shortName: "USA" },
    { name: "United Kingdom", code: "UK", shortName: "GB" },
    { name: "Australia", code: "AU", shortName: "AUS" }
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


const MONTHS = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
];
export {
    MONTHS,
    CountryCodes,
    Regions,
    AchievementTriggers,
    TimeZones,
    Industries,
    DEFAULT_LOCATION_SETTINGS,
}