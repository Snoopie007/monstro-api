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