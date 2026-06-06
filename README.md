# 🌦️ SkyFlow // Premium Weather Dashboard

SkyFlow is a modern, responsive weather dashboard built using pure HTML, CSS, and JavaScript. Designed with premium glassmorphic cards and dynamic backgrounds that morph in real-time depending on active weather conditions (sunny, rainy, snowy, night, cloudy, or stormy).

It features keyless public weather integration, geocoding city suggestions, automatic geolocation coordinates lookup, unit temperature toggling, and local storage bookmarks.

---

## 🚀 Live Demo & Repository
* **GitHub Repository:** `https://github.com/purba0987/weather`
* **Live Deployment Link:** `https://purba0987.github.io/weather/`

---

## ⚡ Tech Stack & Integrations

No local packages or compilers are required. SkyFlow runs entirely client-side, making it highly optimized and lightweight.

* **Core Structure:** Semantic HTML5
* **Styling Engine:** Vanilla CSS3
  * CSS Custom Variables (Design Tokens)
  * Backdrop blur filters (`glassmorphism`)
  * Hardware-accelerated transitions and keyframe animations
  * Fully responsive design (CSS Grid & Flexbox)
* **Logic Controller:** Vanilla ES6+ Javascript
* **UI Elements & Fonts:**
  * Lucide Icons CDN (Outline icons)
  * Google Fonts (`Outfit` for display headings, `Inter` for metadata details)

### 📡 Integrated Keyless APIs
* **Open-Meteo Geocoding API:** `https://geocoding-api.open-meteo.com/v1/search` (Provides debounced autocomplete results for city lookups).
* **Open-Meteo Weather Forecast API:** `https://api.open-meteo.com/v1/forecast` (Retrieves current conditions, 24-hour hourly temperatures, and 7-day weather predictions).
* **Nominatim OpenStreetMap Reverse Geocoder:** `https://nominatim.openstreetmap.org/reverse` (Converts GPS geolocated coordinates into corresponding city name strings).

---

## 📁 File Structure

```text
weather/
├── index.html       # Application frame, inputs, metrics panels, and layouts
├── style.css        # Responsive layouts, glassmorphism tokens, and weather themes
├── app.js           # API handlers, bookmarks manager, conversions, and rendering
└── README.md        # Comprehensive project documentation
```

---

## ✨ Features Included

1. **Weather-themed Dynamic Backgrounds:** The background gradient dynamically transitions depending on the condition and daylight (e.g., warm golden gradients for sunny days, soft indigo/violet layers for rains, and starry deep-space gradients at night).
2. **Interactive Search Autocomplete:** Features a debounced search input (300ms delay) that queries the Geocoding API, preventing excessive API requests while typing and showing instant dropdown suggestions.
3. **Smart Geolocation Detector:** Automatically detects the user's location via the browser's Geolocation API. It runs a reverse-geocoding lookup to find the name of the nearest city.
4. **Detailed Metrics Grid:**
   * **Wind Compass:** A rotating compass dial showing the wind direction pointer and cardinal descriptions.
   * **Humidity Progress Bar:** Smooth visual track with calculated dew point.
   * **UV Index exposure slider:** Identifies safety thresholds and recommendation advice.
   * **Barometer needle dial:** Visual representation of atmospheric pressure.
   * **Sunrise & Sunset tracker:** Local timings.
   * **Cloud cover cell indicator:** Displays cloud coverage percentages.
5. **Horizontal Hourly Carousel:** Interactive 24-hour forecast carousel featuring temperatures and rain chances.
6. **7-Day Forecast:** Detailed forecast list with dynamic temperature bar spreads.
7. **Temperature Switcher:** Instantly converts the dashboard metrics between Celsius (°C) and Fahrenheit (°F), converting wind speeds between km/h and mph accordingly.
8. **Persistent Favorites:** Allows users to bookmark favorite cities. Bookmarks are stored in `localStorage` and persist across browser reloads.

---

## 🛠️ Local Running Instructions

Since it consists of static files, you can launch the dashboard using any simple static file server.

### Option A: Using Python (Built-in)
Run this inside the project folder:
```bash
python -m http.server 3000
```
Then visit: [http://localhost:3000](http://localhost:3000)

### Option B: Using Node.js (npx)
Run this inside the project folder:
```bash
npx -y http-server -p 3000
```
Then visit: [http://localhost:3000](http://localhost:3000)
