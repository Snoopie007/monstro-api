'use client'
import { useState } from 'react';
import { useGoogleMaps } from '../providers';
import { MapPinIcon } from 'lucide-react';

export function AutoComplete({ onSelect }: { onSelect: (place: google.maps.places.Place | undefined) => void }) {
    const [input, setInput] = useState('');
    const [suggestions, setSuggestions] = useState<google.maps.places.AutocompleteSuggestion[]>([]);
    const { isLoaded, google } = useGoogleMaps();
    const [placesLibrary, setPlacesLibrary] = useState<google.maps.PlacesLibrary | null>(null);

    const loadPlacesLibrary = async () => {
        if (!google || placesLibrary) return;
        const library = await google.maps.importLibrary("places") as google.maps.PlacesLibrary;

        setPlacesLibrary(library);
        return library;
    };

    const handleInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setInput(value);

        if (!value || !isLoaded || !google) {
            setSuggestions([]);
            return;
        }
        try {
            const library = placesLibrary || await loadPlacesLibrary();
            if (!library) return;

            const { AutocompleteSessionToken, AutocompleteSuggestion } = library;
            const request = {
                input: value,
                sessionToken: new AutocompleteSessionToken(),
                language: "en-US",
                includedPrimaryTypes: [
                    "child_care_agency",
                    "sports_club",
                    "gym",
                    "sports_activity_location",
                    "health"
                ],
                includedRegionCodes: ["US", "CA"]
            };

            const { suggestions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions(request);

            setSuggestions(suggestions || []);
        } catch (error) {
            console.error('Error fetching predictions:', error);
            setSuggestions([]);
        }
    };

    const handleSelect = async (suggestion: google.maps.places.AutocompleteSuggestion) => {
        const placePrediction = suggestion.placePrediction;
        setInput(placePrediction?.text.toString() || '');
        setSuggestions([]);

        try {
            const place = placePrediction?.toPlace();
            await place?.fetchFields({
                fields: [
                    "displayName",
                    "formattedAddress",
                    'addressComponents',
                    'location',
                    'id',
                    'internationalPhoneNumber',
                    'websiteURI',
                    'rating',
                    'userRatingCount',
                    'primaryType',
                ]
            });

            onSelect(place);
        } catch (error) {
            console.error('Error fetching place details:', error);
        }
    };

    return (
        <div className="relative w-full">
            <div>

                <input
                    type="text"
                    value={input}
                    onChange={handleInput}
                    placeholder="Search your business"
                    className="w-full border border-foreground/10 text-sm h-10 px-3 py-2 rounded-sm"
                />
            </div>

            {suggestions.length > 0 && (
                <ul className=" bg-background mt-1 border border-foreground/10 w-full rounded-md max-h-60 overflow-auto">
                    {suggestions.map((suggestion, index) => {
                        const placePrediction = suggestion.placePrediction;

                        return (
                            <li
                                key={index}
                                className="p-2 text-sm hover:bg-foreground/5 cursor-pointer flex items-center gap-2"
                                onClick={() => handleSelect(suggestion)}
                            >
                                <MapPinIcon className="size-4 " />
                                {placePrediction?.text.toString()}
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}