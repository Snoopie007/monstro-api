
export const BASE_MONSTRO_X_URL = 'https://m.monstro-x.com';
export const BASE_MONSTRO_URL = 'https://mymonstro.com';
export const APPLE_APP_STORE_URL = 'https://apps.apple.com/app/monstro-x/id123456789';
export const GOOGLE_PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.monstro.x';

export type AppStoreBadge = {
    href: string;
    src: string;
    alt: string;
};

export const APP_STORE_BADGES: AppStoreBadge[] = [
    {
        href: APPLE_APP_STORE_URL,
        src: 'https://monstro-bucket.s3.us-east-2.amazonaws.com/assets/appstore-app.png',
        alt: 'Download on the App Store',
    },
    {
        href: GOOGLE_PLAY_STORE_URL,
        src: 'https://monstro-bucket.s3.us-east-2.amazonaws.com/assets/android-app.png',
        alt: 'Get it on Google Play',
    },
];

export const DummyData = {
    user: {
        id: '123',
        name: 'John Doe',
        email: 'john@example.com',
    },
    member: {
        id: '123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
    },
    location: {
        id: '123',
        slug: 'fitstudio',
        name: 'Fit Studio',
        address: '123 Main St, Los Angeles, CA 90001',
        email: 'contact@fitstudio.com',
        phone: '(555) 123-4567',
    }
}
