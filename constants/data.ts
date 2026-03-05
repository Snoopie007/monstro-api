
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
    ALLOWED_AUDIO_TYPES,
    ALLOWED_DOCUMENT_TYPES, ALLOWED_IMAGE_TYPES,
    ALLOWED_VIDEO_TYPES, MonstroData,
    PaymentMethods
};

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


export type HolidayWithPattern = {
    id: number;
    name: string;
    pattern: string;  // "N:dow:month" e.g. "1:day:0", "3:1:0", "L:1:4"
};

const COMMON_HOLIDAYS: HolidayWithPattern[] = [
    { id: 1, name: "New Year's Day", pattern: '1:day:0' },
    { id: 2, name: "MLK Day", pattern: '3:1:0' },
    { id: 3, name: "Presidents' Day", pattern: '3:1:1' },
    { id: 4, name: "Memorial Day", pattern: 'L:1:4' },
    { id: 5, name: "Independence Day", pattern: '4:day:6' },
    { id: 6, name: "Labor Day", pattern: '1:1:8' },
    { id: 7, name: "Columbus Day", pattern: '2:1:9' },
    { id: 8, name: "Veterans Day", pattern: '11:day:10' },
    { id: 9, name: "Thanksgiving", pattern: '4:4:10' },
    { id: 10, name: "Christmas Eve", pattern: '24:day:11' },
    { id: 11, name: "Christmas Day", pattern: '25:day:11' },
    { id: 12, name: "New Year's Eve", pattern: '31:day:11' },
];


const RealTimeEvents = {
    chats: {
        NEW_CHAT: "chats:new",
        UPDATED_CHAT: "chats:updated",
        DELETED_CHAT: "chats:deleted",
        NEW_MESSAGE: "chats:message:new",
    },
    chat: {
        NEW_MESSAGE: "new:message",
        UPDATED_MESSAGE: "updated:message",
        DELETED_MESSAGE: "deleted:message",
    },
    feeds: {
        NEW_FEED: "feed:new",
        UPDATED_FEED: "feed:updated",
        DELETED_FEED: "feed:deleted",
    },
    achievements: {
        UNLOCKED: "achievement:unlocked",
    },
    support: {
        NEW_SUPPORT_MESSAGE: "system:message",
        UPDATED_SUPPORT_MESSAGE: "new:message",
        UPDATED: "updated:support",
        NEW: "new:support",
    }
}

const AchievementTriggers = {
    ATTENDANCES_COUNT: 1,
    REFERRALS_COUNT: 2,
    PLAN_SIGNUP: 3,
    AMOUNT_SPENT: 4,
    SIGNUP: 5,
    FIRST_BOOKING: 6,
    FIRST_MESSAGE: 7,
}

export {
    CountryCodes, TimeZones, Regions, Industries,
    RETRIABLE_PG_CODES, COMMON_HOLIDAYS,
    RealTimeEvents, AchievementTriggers
};