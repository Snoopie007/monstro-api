import * as React from "react";
import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { cn } from "@/libs/utils";
import { Input } from "@/components/forms";

interface AutoCompleteProps {
    onSelectChange: (result: Record<string, any>) => void;
}

declare global {
    interface Window {
        initMap: () => void;
    }
}

export function AutoComplete({ onSelectChange }: AutoCompleteProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [predictions, setPredictions] = useState<google.maps.places.QueryAutocompletePrediction[]>([]);

    const options = {
        componentRestrictions: { country: "us" },
    };

    useEffect(() => {
        window.initMap = () => { };
    }, []);

    function handlePredictions(
        predictions: google.maps.places.QueryAutocompletePrediction[] | null,
        status: google.maps.places.PlacesServiceStatus | null
    ): void {
        if (status !== google.maps.places.PlacesServiceStatus.OK || !predictions) return;
        setPredictions(predictions);
    }

    function handleSearch(e: React.ChangeEvent<HTMLInputElement>) {
        const value = e.target.value;
        if (!value) {
            setPredictions([]);
            return;
        }

        const service = new google.maps.places.AutocompleteService();
        service.getPlacePredictions(
            { input: value, ...options },
            handlePredictions
        );
    }

    function handlePlaceDetails(place: google.maps.places.PlaceResult | null, status: google.maps.places.PlacesServiceStatus) {
        if (
            status !== google.maps.places.PlacesServiceStatus.OK ||
            !place?.address_components ||
            !place.geometry?.location ||
            !place.name
        ) return;

        console.log(place)

        const fullAddress = place.address_components;
        const getAddressComponent = (type: string) =>
            fullAddress.find(comp => comp.types.includes(type))?.long_name || "";


        onSelectChange({
            name: place.name,
            address: `${getAddressComponent("street_number")} ${getAddressComponent("route")}`,
            website: place.website?.replace(/^(https?:\/\/[^\/]+).*$/, '$1'),
            city: getAddressComponent("locality"),
            state: getAddressComponent("administrative_area_level_1"),
            logoUrl: place.icon,
            country: getAddressComponent("country"),
            postalCode: getAddressComponent("postal_code"),
            phone: place.formatted_phone_number,
            metadata: {
                lat: place.geometry.location.lat(),
                lng: place.geometry.location.lng(),
                placeId: place.place_id,
                rating: place.rating,
                totalRatings: place.user_ratings_total,
            }
        });
    }

    async function selectPlace(id: string | undefined) {
        if (!inputRef.current || !id) return;
        inputRef.current.value = "";
        const placesService = new google.maps.places.PlacesService(inputRef.current);
        setPredictions([]);
        await placesService.getDetails({ placeId: id }, handlePlaceDetails);
    }

    return (
        <>
            <Script src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_API_KEY}&libraries=places&callback=initMap`} defer />
            <div className="space-y-2">
                <div className="relative">
                    <Input type="text" ref={inputRef} className="w-full text-foreground" placeholder="Find your business on Google" onChange={handleSearch} />
                </div>

                {predictions.length > 0 && (
                    <div className="border bg-transparent rounded-xs w-full">
                        <ul className="overflow-hidden rounded-sm">
                            {predictions.map((prediction) => (
                                <li
                                    key={prediction.place_id}
                                    className="py-2 px-4 flex flex-row text-foreground items-center gap-2 border-b border-gray-200 cursor-pointer last-of-type:border-b-0 text-sm hover:bg-indigo-600"
                                    onClick={() => selectPlace(prediction.place_id)}
                                >
                                    {prediction.description}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </>
    );
}
