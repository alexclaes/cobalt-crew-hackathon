# Places data (restaurants, bars, hotels) – shape, examples, filtering

## Data shape we return

Every place from the API has this shape (same for restaurants, bars, hotels; `type` is added on the client):

```ts
interface Place {
  id: string;           // e.g. "node-12345" or "way-67890"
  name: string;
  lat: number;
  lon: number;
  type?: 'restaurant' | 'bar' | 'hotel';  // only in frontend
  cuisine?: string;     // food style / type
  priceRange?: string;  // price hint (OSM has no standard)
  openingHours?: string;
}
```

---

## Example payloads

### Restaurant

```json
{
  "id": "node-482917263",
  "name": "Vapiano",
  "lat": 53.55034,
  "lon": 9.99234,
  "cuisine": "italian",
  "priceRange": "€€",
  "openingHours": "Mo-Su 11:00-23:00"
}
```

### Bar

```json
{
  "id": "way-9876543",
  "name": "Reeperbahn Bar",
  "lat": 53.54987,
  "lon": 9.96321,
  "cuisine": "beer",
  "openingHours": "Th-Sa 20:00-04:00"
}
```

### Hotel (often less tagged)

```json
{
  "id": "node-11223344",
  "name": "Hotel Hafen Hamburg",
  "lat": 53.54412,
  "lon": 9.96111,
  "priceRange": "€€€",
  "openingHours": "24/7"
}
```

### Minimal (only required fields from OSM)

```json
{
  "id": "node-555555",
  "name": "Unnamed",
  "lat": 53.55,
  "lon": 10.0
}
```

- **name**: From OSM `name`; we fallback to `"Unnamed"` if missing.
- **cuisine**: From OSM `cuisine` (or `diet`). Values are free text, e.g. `italian`, `german`, `burger`, `coffee_shop`, `beer`.
- **priceRange**: From OSM `price_range`, `fee`, or `currency`. No standard; you see `€`, `€€`, `€€€`, `moderate`, `high`, etc.
- **openingHours**: From OSM `opening_hours`. Syntax is standardized (e.g. `Mo-Fr 09:00-18:00; Sa 10:00-14:00`).

---

## Where it comes from (OSM tags)

| Our field     | OSM tag(s)        | Notes |
|---------------|-------------------|--------|
| `name`        | `name`            | Fallback `"Unnamed"` |
| `cuisine`     | `cuisine`, `diet` | Free text |
| `priceRange`  | `price_range`, `fee`, `currency` | Not standardized |
| `openingHours`| `opening_hours`   | [OH spec](https://wiki.openstreetmap.org/wiki/Key:opening_hours) |

Many places, especially hotels, only have `name` and coordinates; `cuisine`/`priceRange`/`openingHours` are often missing.

---

## Recommendations: how to filter for users

### 1. **Client-side filters (quick win)**

- **By cuisine**  
  - Add a dropdown or chips: “Italian”, “German”, “Burger”, “Coffee”, etc.  
  - Filter `places.filter(p => p.cuisine?.toLowerCase().includes(selectedCuisine))`.  
  - Normalize: map OSM values (e.g. `italian`, `pizza`) to display labels and optional synonyms.

- **By price**  
  - If you normalize `priceRange` (e.g. map `€`, `€€`, `€€€` to 1–3), offer “Budget / Mid / High” and filter by that.  
  - Hide or put “Price unknown” in a separate group; many places have no price tag.

- **By “has opening hours”**  
  - Toggle “Only show places with opening hours” and filter `p.openingHours`.

- **By name search**  
  - Simple text filter: `places.filter(p => p.name.toLowerCase().includes(query))`.

### 2. **API-level filters (fewer results, faster)**

- **Query params** (e.g. `cuisine=italian`, `maxResults=50`):  
  - We currently return all OSM nodes/ways in radius; filtering in the API would mean: parse response → filter by `cuisine` / `name` → then sort and slice.  
  - Good for limiting payload size and enabling “nearest N Italian restaurants”.

- **Limit**  
  - Add `limit=50` (or similar), sort by distance, return only the first N.  
  - Reduces Overpass load and response size; “nearest first” is already implemented, so this is a simple slice.

### 3. **Better UX**

- **Show “no info” clearly**  
  - In the list/map popup: e.g. “Cuisine: —”, “Price: —” when fields are missing so users know data is incomplete.

- **Normalize cuisine for filters**  
  - Build a small list of allowed/synonym values from your data (e.g. `italian`, `pizza` → “Italian”) and filter on normalized value while still displaying raw OSM value if needed.

- **Optional: opening_hours parsing**  
  - Use a library (e.g. `opening_hours.js`) to show “Open now” / “Closed” and filter by “Open now” for a better experience.

### 4. **What to add first**

1. **Limit** (e.g. `limit=50`) in the API and optionally in the UI (e.g. “Show top 50 nearest”).  
2. **Client-side cuisine filter**: dropdown/chips from unique `cuisine` values in the current result set.  
3. **Client-side name search** in the places list.  
4. **Optional API param** `cuisine=...` if you want to reduce payload and make “Italian only” etc. a permalink/shareable option.

---

## Example: filter state and UI

```ts
// Example filter state
const [cuisineFilter, setCuisineFilter] = useState<string | null>(null);
const [priceFilter, setPriceFilter] = useState<1 | 2 | 3 | null>(null); // €, €€, €€€
const [nameQuery, setNameQuery] = useState('');

// Derived list
const filteredPlaces = useMemo(() => {
  let list = places;
  if (cuisineFilter)
    list = list.filter(p => p.cuisine?.toLowerCase().includes(cuisineFilter.toLowerCase()));
  if (priceFilter)
    list = list.filter(p => parsePriceLevel(p.priceRange) === priceFilter);
  if (nameQuery.trim())
    list = list.filter(p => p.name.toLowerCase().includes(nameQuery.trim().toLowerCase()));
  return list;
}, [places, cuisineFilter, priceFilter, nameQuery]);
```

Use `filteredPlaces` for the map markers and the list; keep `places` as the unfiltered API result.
