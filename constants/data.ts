
type MonstroDataType = {
    fullAddress: string;
    phone: string;
    email: string;
    url: string;
    privacyUrl: string;
    termsUrl: string;
    supportUrl: string;
    unsubscribeUrl: string;
    logoUrl: string;
    youtubeUrl: string;
    linkedinUrl: string;
    instagramUrl: string;
    facebookUrl: string;
    xUrl: string;
}
const MonstroData: MonstroDataType = {
    fullAddress: '7901 4th ST N STE 300 St Petersburg, FL 33702, USA',
    phone: '(786) 686-6079',
    email: 'support@mymonstro.com',
    url: 'https://monstro-x.com',
    privacyUrl: 'https://monstro-x.com/legal/privacy-policy',
    termsUrl: 'https://monstro-x.com/legal/terms-of-service',
    supportUrl: 'https://monstro-x.com/support',
    unsubscribeUrl: 'https://monstro-x.com/unsubscribe',
    logoUrl: 'https://monstro-x.com/logo.png',
    youtubeUrl: 'https://www.youtube.com/@monstro',
    linkedinUrl: 'https://www.linkedin.com/company/monstro',
    instagramUrl: 'https://www.instagram.com/monstro',
    facebookUrl: 'https://www.facebook.com/monstro',
    xUrl: 'https://x.com/monstro',
}

const PaymentMethods: string[] = [
    "card",
    "cash",
    "zelle",
    "bank payment",
    "cheque"
]

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/x-msvideo'];
const ALLOWED_AUDIO_TYPES = ['audio/mpeg', 'audio/wav', 'audio/ogg'];
const ALLOWED_DOCUMENT_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
// Social icon map for Monstro communication channels



export {
    MonstroData,
    PaymentMethods,
    ALLOWED_IMAGE_TYPES,
    ALLOWED_VIDEO_TYPES,
    ALLOWED_AUDIO_TYPES,
    ALLOWED_DOCUMENT_TYPES
}

export type { MonstroDataType };



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


const RETRIABLE_PG_CODES = [
    '40P01',   // deadlock_detected
    '40001',   // serialization_failure
    '53100',   // out_of_memory
    '53200',   // out_of_memory (alternate)
    '53300',   // too_many_connections
    '57P01',   // admin_shutdown
    '57P02',   // crash_shutdown
    '57P03',   // cannot_connect_now
    '08000',   // connection_exception
    '08003',   // connection_does_not_exist
    '08006',   // connection_failure
    '55P03',   // lock_not_available
];

export { CountryCodes, TimeZones, Regions, Industries, RETRIABLE_PG_CODES };