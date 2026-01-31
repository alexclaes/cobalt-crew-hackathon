# 🧭 Weekend Trip Planner – 24h MVP Plan

## 🎯 Goal
Develop a fully functional MVP in 24 hours that:
- accepts multiple starting locations,
- calculates the geographic midpoint,
- finds nearby cities within a given radius,
- displays them on a map,
- and generates a simple trip preview page with a shareable link.

Everything else (user system, calendar, advanced filters) will **not** be implemented — only stubbed or visually suggested.

---

## 💡 MVP Feature Scope (24h)

### Must-have (deliverable)
1. **Start Location Input**
   - Manual input (text field or clickable map)
   - Multiple start points possible
2. **Midpoint Calculation**
   - Simple geographic midpoint calculation (e.g., average of lat/lon using Haversine)
3. **Nearby City Search**
   - 50 km radius
   - Use external API or static dataset (OpenTripMap, GeoDB Cities API)
4. **Map View**
   - Map component (Mapbox or Leaflet) showing markers for start points, midpoint, and suggested cities
5. **Trip Preview Page**
   - Displays calculated meeting point + suggested cities
   - Generates a “share link” (URL slug, no real user system)

---

## 🚀 Optional (only if time allows)
- Focus filters: “Wellness / Nature / City” (visual only)
- Dummy data for restaurants or hotels
- Mock calendar field (“suggest date range”) with no real integration



## ⏱️ Time Schedule

| Phase | Timeframe | Goals |
|--------|------------|--------|
| 0️⃣ Setup | 0–1 h | Repo setup, boilerplate, map API keys |
| 1️⃣ Core Logic | 1–5 h | Midpoint + nearby city search |
| 2️⃣ UI Prototype | 5–10 h | Map, markers, list view, input |
| 3️⃣ Integration | 10–17 h | Frontend ↔ Backend connection, link sharing |
| 4️⃣ Styling & UX | 17–21 h | Tailwind polish, icons, minor animations |
| 5️⃣ Demo & Fix | 21–24 h | Bug fixes, prepare 2‑minute pitch |

---

## 🎬 Deliverable
- A working web app deployed (e.g., Vercel live demo)  
- Example link:  
