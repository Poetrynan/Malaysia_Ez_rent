/**
 * Minimal Google Maps JavaScript API type declarations.
 * Covers only the Places API surface used in AdminPanel.tsx.
 * Install @types/google.maps for full coverage.
 */

declare namespace google {
  namespace maps {
    namespace places {
      type PlacesServiceStatus = string;

      // Make OK available as a constant string value
      const PlacesServiceStatus: {
        OK: PlacesServiceStatus;
        ZERO_RESULTS: PlacesServiceStatus;
        OVER_QUERY_LIMIT: PlacesServiceStatus;
        REQUEST_DENIED: PlacesServiceStatus;
        INVALID_REQUEST: PlacesServiceStatus;
        UNKNOWN_ERROR: PlacesServiceStatus;
      };

      interface StructuredFormatting {
        main_text: string;
        secondary_text: string;
      }

      interface AutocompletePrediction {
        description: string;
        place_id: string;
        structured_formatting: StructuredFormatting;
      }

      interface AutocompleteRequest {
        input: string;
        componentRestrictions?: { country: string | string[] };
        types?: string[];
      }

      class AutocompleteService {
        getPlacePredictions(
          request: AutocompleteRequest,
          callback: (
            predictions: AutocompletePrediction[] | null,
            status: PlacesServiceStatus
          ) => void
        ): void;
      }

      interface LatLng {
        lat(): number;
        lng(): number;
      }

      interface PlaceGeometry {
        location: LatLng;
      }

      interface PlaceResult {
        name?: string;
        formatted_address?: string;
        geometry?: PlaceGeometry;
      }

      interface PlaceDetailsRequest {
        placeId: string;
        fields?: string[];
      }

      class PlacesService {
        constructor(attrContainer: HTMLDivElement | HTMLElement | Map);
        getDetails(
          request: PlaceDetailsRequest,
          callback: (
            place: PlaceResult | null,
            status: PlacesServiceStatus
          ) => void
        ): void;
      }

      // Stub Map class referenced by PlacesService constructor
      class Map {
        constructor(mapDiv: HTMLElement, opts?: object);
      }
    }
  }
}

// Extend the Window interface so window.google is recognised
interface Window {
  google?: typeof google;
}
