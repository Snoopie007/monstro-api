

const MonstroData = {
    fullAddress: '7901 4th ST N STE 300 St Petersburg, FL 33702, USA',
    phone: '(786) 686-6079',
    email: 'support@mymonstro.com',
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

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/x-msvideo'];
const ALLOWED_AUDIO_TYPES = ['audio/mpeg', 'audio/wav', 'audio/ogg'];
const ALLOWED_DOCUMENT_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];


export {
    MonstroData,
    PaymentMethods,
    ALLOWED_IMAGE_TYPES,
    ALLOWED_VIDEO_TYPES,
    ALLOWED_AUDIO_TYPES,
    ALLOWED_DOCUMENT_TYPES
}