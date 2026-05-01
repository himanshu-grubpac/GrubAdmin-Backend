import { GOOGLE_MAPS_API_KEY } from "@/configs/env";
import { APIError } from "@/types/error";
import { PlacesClient } from "@googlemaps/places";

export class GoogleMap {
	private placesClient: PlacesClient;

	constructor() {
		this.placesClient = new PlacesClient({
			apiKey: GOOGLE_MAPS_API_KEY,
		});
	}

	async getLatLong(placeId: string) {
		const [place] = await this.placesClient.getPlace(
			{
				name: `places/${placeId}`,
				languageCode: "en",
			},
			{
				otherArgs: {
					headers: {
						"X-Goog-FieldMask": "location,formattedAddress",
					},
				},
			},
		);

		if (!place.location) {
			throw new APIError("Location not found for this place_id", undefined, undefined, 404);
		}

		return {
			latitude: place.location.latitude,
			longitude: place.location.longitude,
		};
	}
}
