'use client'
import { createContext, useState, useContext } from 'react';
import Script from 'next/script';


interface GoogleMapsContextType {
    isLoaded: boolean;
    google: typeof google | null;
}

const GoogleMapsContext = createContext<GoogleMapsContextType>({
    isLoaded: false,
    google: null
});

export const GoogleMapProvider = ({ children }: { children: React.ReactNode }) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [googleMaps, setGoogleMaps] = useState<typeof google | null>(null);

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;

    const handleScriptLoad = () => {
        // Wait for google maps to be fully loaded
        if (window.google && window.google.maps) {

            setGoogleMaps(window.google);
            setIsLoaded(true);
        } else {
            setTimeout(handleScriptLoad, 100);
        }
    };

    return (
        <>
            <Script
                src={`https://maps.googleapis.com/maps/api/js?key=${apiKey}&loading=async&libraries=places`}
                onLoad={handleScriptLoad}
                defer
            />
            <GoogleMapsContext.Provider value={{
                isLoaded,
                google: googleMaps
            }}>
                {children}
            </GoogleMapsContext.Provider>
        </>
    );
};

export const useGoogleMaps = () => useContext(GoogleMapsContext);
