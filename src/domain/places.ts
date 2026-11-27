export type Place = {
  city: string;
  lat: number;
  lon: number;
  timeZone: string;
};

export const PLACES: readonly Place[] = [
  { city: "Dumaguete", lat: 9.3068, lon: 123.3054, timeZone: "Asia/Manila" },
  { city: "Manila", lat: 14.5995, lon: 120.9842, timeZone: "Asia/Manila" },
  { city: "Cebu", lat: 10.3157, lon: 123.8854, timeZone: "Asia/Manila" },
  { city: "Singapore", lat: 1.3521, lon: 103.8198, timeZone: "Asia/Singapore" },
  { city: "Sydney", lat: -33.8688, lon: 151.2093, timeZone: "Australia/Sydney" },
  { city: "Johannesburg", lat: -26.2041, lon: 28.0473, timeZone: "Africa/Johannesburg" },
  { city: "London", lat: 51.5072, lon: -0.1276, timeZone: "Europe/London" },
  { city: "Berlin", lat: 52.52, lon: 13.405, timeZone: "Europe/Berlin" },
  { city: "Dubai", lat: 25.2048, lon: 55.2708, timeZone: "Asia/Dubai" },
  { city: "Mumbai", lat: 19.076, lon: 72.8777, timeZone: "Asia/Kolkata" },
  { city: "New York", lat: 40.7128, lon: -74.006, timeZone: "America/New_York" },
  { city: "Chicago", lat: 41.8781, lon: -87.6298, timeZone: "America/Chicago" },
  { city: "Los Angeles", lat: 34.0522, lon: -118.2437, timeZone: "America/Los_Angeles" },
  { city: "São Paulo", lat: -23.5558, lon: -46.6396, timeZone: "America/Sao_Paulo" },
];

export const TIME_ZONES: readonly string[] = [...new Set(PLACES.map((place) => place.timeZone)), "Pacific/Auckland", "Europe/Paris"];
