export type PlaceType = 
  | 'restaurant' | 'bar' | 'hotel' 
  | 'camping' | 'hostel' | 'shop' 
  | 'museum' | 'theatre' | 'spa'
  | 'natural formations' | 'brewery map' 
  | 'historic' | 'elevation' | 'dog map';

export const THEME_PLACE_TYPES: Record<string, PlaceType[]> = {
  'Nature': ['camping', 'hostel', 'natural formations'],
  'Shopping': ['shop', 'hotel', 'restaurant'],
  'Food & Drink': ['restaurant', 'bar', 'brewery map'],
  'City Exploration': ['restaurant', 'bar', 'hotel', 'brewery map'],
  'Cultural': ['museum', 'theatre', 'historic', 'hotel'],
  'Adventure': ['camping', 'hostel', 'elevation'],
  'Family-Friendly': ['restaurant', 'hotel', 'dog map'],
  'Wellness': ['spa', 'hotel'],
};

export function getPlaceTypesForTheme(themeName: string): PlaceType[] {
  return THEME_PLACE_TYPES[themeName] || ['restaurant', 'bar', 'hotel'];
}
