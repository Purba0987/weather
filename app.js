/**
 * SkyFlow Weather Dashboard Engine
 * Powered by Open-Meteo API
 */

// ==========================================================================
// STATE MANAGEMENT & GLOBALS
// ==========================================================================
let state = {
    activeCoords: {
        lat: 51.5085,
        lon: -0.1257,
        city: 'London',
        country: 'United Kingdom'
    },
    tempUnit: 'C', // 'C' or 'F'
    favorites: [],
    searchDebounceTimer: null,
    weatherDataCache: null
};

// Default coordinates on initial load (London)
const DEFAULT_COORDS = {
    lat: 51.5085,
    lon: -0.1257,
    city: 'London',
    country: 'United Kingdom'
};

// ==========================================================================
// DOM ELEMENT REFERENCES
// ==========================================================================
const DOM = {
    // Header Inputs & Controls
    searchInput: document.getElementById('search-input'),
    clearSearchBtn: document.getElementById('clear-search'),
    suggestionsDropdown: document.getElementById('suggestions-dropdown'),
    geoBtn: document.getElementById('geo-btn'),
    favsToggleBtn: document.getElementById('favs-toggle-btn'),
    favsDropdown: document.getElementById('favs-dropdown'),
    favsList: document.getElementById('favs-list'),
    unitC: document.getElementById('unit-c'),
    unitF: document.getElementById('unit-f'),

    // Current Weather Elements
    currentWeatherCard: document.getElementById('current-weather-card'),
    weatherContent: document.querySelector('.weather-card-content'),
    cityName: document.getElementById('city-name'),
    countryName: document.getElementById('country-name'),
    saveLocationBtn: document.getElementById('save-location-btn'),
    currentTemp: document.getElementById('current-temp'),
    weatherDescription: document.getElementById('weather-description'),
    feelsLike: document.getElementById('feels-like'),
    mainIconContainer: document.getElementById('main-weather-icon-container'),
    currentTempMax: document.getElementById('current-temp-max'),
    currentTempMin: document.getElementById('current-temp-min'),
    currentTime: document.getElementById('current-time'),

    // Skeletons
    skeletonCurrent: document.querySelector('.skeleton-current'),
    skeletonHourly: document.querySelector('.skeleton-hourly-container'),
    skeletonDaily: document.querySelector('.skeleton-daily-container'),

    // Containers
    hourlyScroll: document.getElementById('hourly-scroll-container'),
    dailyList: document.getElementById('daily-forecast-list'),

    // Metrics Widgets
    windSpeed: document.getElementById('wind-speed'),
    windUnit: document.getElementById('wind-unit'),
    windDirectionText: document.getElementById('wind-direction-text'),
    windCompassPointer: document.getElementById('wind-compass-pointer'),
    humidityValue: document.getElementById('humidity-value'),
    humidityBar: document.getElementById('humidity-bar'),
    humiditySubtext: document.getElementById('humidity-subtext'),
    uvValue: document.getElementById('uv-value'),
    uvPointer: document.getElementById('uv-pointer'),
    uvAdvice: document.getElementById('uv-advice'),
    sunriseTime: document.getElementById('sunrise-time'),
    sunsetTime: document.getElementById('sunset-time'),
    pressureValue: document.getElementById('pressure-value'),
    pressureSubtext: document.getElementById('pressure-subtext'),
    barometerNeedle: document.getElementById('barometer-needle'),
    cloudinessValue: document.getElementById('cloudiness-value'),
    cloudCells: document.querySelectorAll('.cloud-cell'),
    cloudSubtext: document.getElementById('cloud-subtext'),
    toastContainer: document.getElementById('toast-container')
};

// ==========================================================================
// APPLICATION INITIALIZATION
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
    loadSettingsFromStorage();
    setupEventListeners();
    fetchWeatherData(state.activeCoords.lat, state.activeCoords.lon);
});

// Load user choices (favorites, last search, temp units) from Local Storage
function loadSettingsFromStorage() {
    // 1. Temperature Unit
    const storedUnit = localStorage.getItem('skyflow_temp_unit');
    if (storedUnit === 'C' || storedUnit === 'F') {
        state.tempUnit = storedUnit;
        updateUnitToggleUI();
    }

    // 2. Active Location
    const storedLocation = localStorage.getItem('skyflow_active_location');
    if (storedLocation) {
        try {
            state.activeCoords = JSON.parse(storedLocation);
        } catch (e) {
            state.activeCoords = DEFAULT_COORDS;
        }
    }

    // 3. Saved Favorites
    const storedFavs = localStorage.getItem('skyflow_favorites');
    if (storedFavs) {
        try {
            state.favorites = JSON.parse(storedFavs);
        } catch (e) {
            state.favorites = [];
        }
    }
    renderFavoritesDropdown();
}

// ==========================================================================
// EVENT LISTENERS SETUP
// ==========================================================================
function setupEventListeners() {
    // Autocomplete Search Input
    DOM.searchInput.addEventListener('input', handleSearchInput);
    DOM.searchInput.addEventListener('focus', () => {
        if (DOM.searchInput.value.trim().length >= 2) {
            DOM.suggestionsDropdown.classList.remove('hidden');
        }
    });

    // Clear Search Input
    DOM.clearSearchBtn.addEventListener('click', () => {
        DOM.searchInput.value = '';
        DOM.clearSearchBtn.classList.add('hidden');
        DOM.suggestionsDropdown.classList.add('hidden');
        DOM.searchInput.focus();
    });

    // Close Dropdowns on Click Outside
    document.addEventListener('click', (e) => {
        if (!DOM.searchInput.contains(e.target) && !DOM.suggestionsDropdown.contains(e.target)) {
            DOM.suggestionsDropdown.classList.add('hidden');
        }
        
        const favsWrapper = DOM.favsToggleBtn.parentElement;
        if (!favsWrapper.contains(e.target)) {
            DOM.favsDropdown.classList.add('hidden');
            favsWrapper.classList.remove('open');
        }
    });

    // Toggle Favorites List UI
    DOM.favsToggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = !DOM.favsDropdown.classList.contains('hidden');
        DOM.favsDropdown.classList.toggle('hidden', isOpen);
        DOM.favsToggleBtn.parentElement.classList.toggle('open', !isOpen);
    });

    // Toggle Location Favorite Status
    DOM.saveLocationBtn.addEventListener('click', toggleCurrentFavorite);

    // Geolocation Trigger
    DOM.geoBtn.addEventListener('click', triggerGeolocation);

    // Celsius/Fahrenheit Controls
    DOM.unitC.addEventListener('click', () => setTemperatureUnit('C'));
    DOM.unitF.addEventListener('click', () => setTemperatureUnit('F'));

    // Keyboard navigation accessibility
    DOM.searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            DOM.suggestionsDropdown.classList.add('hidden');
            DOM.searchInput.blur();
        }
    });
}

// ==========================================================================
// GEOLOCATION MODULE
// ==========================================================================
function triggerGeolocation() {
    if (!navigator.geolocation) {
        showToast('Geolocation is not supported by your browser.', 'error');
        return;
    }

    DOM.geoBtn.disabled = true;
    const initialText = DOM.geoBtn.querySelector('span').textContent;
    DOM.geoBtn.querySelector('span').textContent = 'Locating...';

    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            
            showToast('Location identified! Fetching weather data...', 'success');
            
            // Try to resolve city name using Nominatim reverse geocoding
            let city = 'My Location';
            let country = 'GPS Coordinates';
            try {
                const response = await fetch(
                    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=en`,
                    { headers: { 'User-Agent': 'SkyFlowWeatherDashboard/1.0' } }
                );
                if (response.ok) {
                    const data = await response.json();
                    city = data.address.city || data.address.town || data.address.village || data.address.suburb || 'Current Location';
                    country = data.address.country || 'Global';
                }
            } catch (err) {
                console.warn('Reverse geocoding failed, falling back to My Location.', err);
            }

            state.activeCoords = { lat, lon, city, country };
            localStorage.setItem('skyflow_active_location', JSON.stringify(state.activeCoords));
            
            await fetchWeatherData(lat, lon);
            
            DOM.geoBtn.disabled = false;
            DOM.geoBtn.querySelector('span').textContent = initialText;
        },
        (error) => {
            console.error('Geolocation error:', error);
            let errMsg = 'Failed to retrieve your location.';
            if (error.code === error.PERMISSION_DENIED) {
                errMsg = 'Location access denied. Please search for your city instead.';
            }
            showToast(errMsg, 'error');
            DOM.geoBtn.disabled = false;
            DOM.geoBtn.querySelector('span').textContent = initialText;
        },
        { enableHighAccuracy: true, timeout: 8000 }
    );
}

// ==========================================================================
// SEARCH & AUTOCOMPLETE GEOCODING MODULE
// ==========================================================================
function handleSearchInput() {
    const query = DOM.searchInput.value.trim();
    DOM.clearSearchBtn.classList.toggle('hidden', query.length === 0);

    if (state.searchDebounceTimer) {
        clearTimeout(state.searchDebounceTimer);
    }

    if (query.length < 2) {
        DOM.suggestionsDropdown.classList.add('hidden');
        DOM.suggestionsDropdown.innerHTML = '';
        return;
    }

    state.searchDebounceTimer = setTimeout(() => {
        executeGeocoding(query);
    }, 30000 / 100); // 300ms delay
}

async function executeGeocoding(query) {
    try {
        const response = await fetch(
            `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`
        );
        if (!response.ok) throw new Error('Geocoding search failed.');

        const data = await response.json();
        renderSuggestions(data.results || []);
    } catch (err) {
        console.error('Geocoding fetch error:', err);
    }
}

function renderSuggestions(results) {
    DOM.suggestionsDropdown.innerHTML = '';
    
    if (results.length === 0) {
        DOM.suggestionsDropdown.innerHTML = `<div class="suggestion-no-results">No results found for "${DOM.searchInput.value}"</div>`;
        DOM.suggestionsDropdown.classList.remove('hidden');
        return;
    }

    results.forEach(loc => {
        const item = document.createElement('div');
        item.className = 'suggestion-item';
        
        const region = loc.admin1 ? `${loc.admin1}, ` : '';
        const subtitle = `${region}${loc.country || ''}`;

        item.innerHTML = `
            <span class="suggestion-title">${loc.name}</span>
            <span class="suggestion-subtitle">${subtitle}</span>
        `;

        item.addEventListener('click', () => {
            state.activeCoords = {
                lat: loc.latitude,
                lon: loc.longitude,
                city: loc.name,
                country: loc.country || ''
            };
            
            // Save last search
            localStorage.setItem('skyflow_active_location', JSON.stringify(state.activeCoords));
            
            // UI Updates
            DOM.searchInput.value = loc.name;
            DOM.suggestionsDropdown.classList.add('hidden');
            DOM.clearSearchBtn.classList.remove('hidden');
            
            // Fetch
            fetchWeatherData(loc.latitude, loc.longitude);
        });

        DOM.suggestionsDropdown.appendChild(item);
    });

    DOM.suggestionsDropdown.classList.remove('hidden');
}

// ==========================================================================
// WEATHER DATA INTEGRATION & API MODULE
// ==========================================================================
async function fetchWeatherData(lat, lon) {
    setLoadingState(true);
    
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m,uv_index&hourly=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,precipitation_probability&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,sunrise,sunset,uv_index_max,precipitation_sum&timezone=auto`;

    try {
        const response = await fetch(weatherUrl);
        if (!response.ok) throw new Error('Could not fetch weather forecast.');

        const data = await response.json();
        state.weatherDataCache = data;
        
        renderWeatherDashboard(data);
    } catch (err) {
        console.error('Weather fetching error:', err);
        showToast('Could not retrieve weather forecast. Please check connection.', 'error');
    } finally {
        setLoadingState(false);
    }
}

function setLoadingState(isLoading) {
    if (isLoading) {
        DOM.weatherContent.classList.add('hidden');
        DOM.hourlyScroll.classList.add('hidden');
        DOM.dailyList.classList.add('hidden');
        
        DOM.skeletonCurrent.classList.remove('hidden');
        DOM.skeletonHourly.classList.remove('hidden');
        DOM.skeletonDaily.classList.remove('hidden');
    } else {
        DOM.skeletonCurrent.classList.add('hidden');
        DOM.skeletonHourly.classList.add('hidden');
        DOM.skeletonDaily.classList.add('hidden');
        
        DOM.weatherContent.classList.remove('hidden');
        DOM.hourlyScroll.classList.remove('hidden');
        DOM.dailyList.classList.remove('hidden');
    }
}

// ==========================================================================
// METRIC CONVERSIONS & UI RENDERERS
// ==========================================================================
function renderWeatherDashboard(data) {
    const cur = data.current;
    const isDay = cur.is_day === 1;
    const weatherCode = cur.weather_code;
    const weatherInfo = mapWMOCode(weatherCode, isDay);

    // Apply Background Theme
    applyWeatherTheme(weatherInfo.theme);

    // Current Header
    DOM.cityName.textContent = state.activeCoords.city;
    DOM.countryName.textContent = state.activeCoords.country;
    
    // Star toggle button highlight
    const isFav = state.favorites.some(f => f.lat.toFixed(3) === state.activeCoords.lat.toFixed(3) && f.lon.toFixed(3) === state.activeCoords.lon.toFixed(3));
    DOM.saveLocationBtn.classList.toggle('active', isFav);

    // Temperature & Conditions
    const formattedTemp = formatTempVal(cur.temperature_2m);
    DOM.currentTemp.textContent = Math.round(formattedTemp);
    DOM.weatherDescription.textContent = weatherInfo.description;
    DOM.feelsLike.innerHTML = `Feels like: ${Math.round(formatTempVal(cur.apparent_temperature))}&deg;`;

    // Dynamic Weather Icon Injection
    DOM.mainIconContainer.innerHTML = `<i data-lucide="${weatherInfo.iconName}" style="width:100%; height:100%; color: var(--accent-color);"></i>`;

    // High/Low and Time Footer
    DOM.currentTempMax.innerHTML = `${Math.round(formatTempVal(data.daily.temperature_2m_max[0]))}&deg;`;
    DOM.currentTempMin.innerHTML = `${Math.round(formatTempVal(data.daily.temperature_2m_min[0]))}&deg;`;
    
    // Parse time
    const localTimeStr = formatTime(cur.time, data.timezone);
    DOM.currentTime.textContent = localTimeStr;

    // --- RENDER DETAILED WIDGETS ---
    
    // 1. Wind speed & Compass pointer rotation
    const rawWindSp = cur.wind_speed_10m; // km/h
    const convertedWind = state.tempUnit === 'C' ? rawWindSp : rawWindSp * 0.621371; // mph
    DOM.windSpeed.textContent = convertedWind.toFixed(1);
    DOM.windUnit.textContent = state.tempUnit === 'C' ? 'km/h' : 'mph';
    
    const windDirDeg = cur.wind_direction_10m;
    DOM.windCompassPointer.style.transform = `rotate(${windDirDeg}deg)`;
    DOM.windDirectionText.textContent = `From ${getCompassDirection(windDirDeg)}`;

    // 2. Humidity Progress bar and Dew Point calculation
    DOM.humidityValue.textContent = Math.round(cur.relative_humidity_2m);
    DOM.humidityBar.style.width = `${cur.relative_humidity_2m}%`;
    const dewPoint = calculateDewPoint(cur.temperature_2m, cur.relative_humidity_2m);
    DOM.humiditySubtext.innerHTML = `Dew point is ${Math.round(formatTempVal(dewPoint))}&deg;`;

    // 3. UV Index slider
    const uvVal = cur.uv_index;
    DOM.uvValue.textContent = uvVal.toFixed(1);
    DOM.uvPointer.style.left = `${Math.min((uvVal / 12) * 100, 100)}%`;
    DOM.uvAdvice.textContent = getUVLevelDescription(uvVal);

    // 4. Sunrise & Sunset Times
    DOM.sunriseTime.textContent = formatTime(data.daily.sunrise[0], data.timezone);
    DOM.sunsetTime.textContent = formatTime(data.daily.sunset[0], data.timezone);

    // 5. Barometer dial
    const pressure = cur.pressure_msl;
    DOM.pressureValue.textContent = Math.round(pressure);
    const pressurePercentage = Math.max(0, Math.min(100, ((pressure - 950) / 100) * 100)); // Map 950-1050 to 0-100%
    DOM.barometerNeedle.style.left = `${pressurePercentage}%`;
    DOM.pressureSubtext.textContent = getPressureTrend(pressure);

    // 6. Cloud cover blocks indicator grid
    DOM.cloudinessValue.textContent = cur.cloud_cover;
    const cellsToActivate = Math.ceil(cur.cloud_cover / 10);
    DOM.cloudCells.forEach((cell, idx) => {
        cell.classList.toggle('active', idx < cellsToActivate);
    });
    DOM.cloudSubtext.textContent = getCloudCoverDescription(cur.cloud_cover);

    // --- RENDER HOURLY TIMELINE ---
    renderHourlyTimeline(data);

    // --- RENDER 7-DAY FORECAST ---
    render7DayForecast(data);

    // Regenerate Lucide SVGs
    lucide.createIcons();
}

// Renders the hourly horizontal scroll section
function renderHourlyTimeline(data) {
    DOM.hourlyScroll.innerHTML = '';
    
    // Find index matching the current hour
    const currentTimeStr = data.current.time.slice(0, 13) + ':00';
    let startIndex = data.hourly.time.findIndex(t => t.startsWith(currentTimeStr));
    if (startIndex === -1) startIndex = 0;

    // Output the next 24 hours
    for (let i = startIndex; i < startIndex + 24; i++) {
        if (i >= data.hourly.time.length) break;

        const time = data.hourly.time[i];
        const temp = data.hourly.temperature_2m[i];
        const code = data.hourly.weather_code[i];
        const rainChance = data.hourly.precipitation_probability ? data.hourly.precipitation_probability[i] : 0;
        
        // Parse time to local hour
        const hrDate = new Date(time);
        let hrString = hrDate.toLocaleTimeString([], { hour: 'numeric' });
        
        // Match icon
        const isHrDay = hrDate.getHours() > 6 && hrDate.getHours() < 20; // fallback day-check
        const iconInfo = mapWMOCode(code, isHrDay);

        const item = document.createElement('div');
        item.className = 'hour-forecast-item';
        
        let rainBadge = '';
        if (rainChance > 10) {
            rainBadge = `<span class="hour-rain-chance"><i data-lucide="droplets" style="width:10px; height:10px;"></i>${rainChance}%</span>`;
        }

        item.innerHTML = `
            <span class="hour-time">${hrString}</span>
            <div class="hour-icon">
                <i data-lucide="${iconInfo.iconName}" style="color: ${iconInfo.theme === 'sunny' ? 'var(--accent-color)' : '#94a3b8'};"></i>
            </div>
            <span class="hour-temp">${Math.round(formatTempVal(temp))}&deg;</span>
            ${rainBadge}
        `;

        DOM.hourlyScroll.appendChild(item);
    }
}

// Renders the 7-day weather list
function render7DayForecast(data) {
    DOM.dailyList.innerHTML = '';

    for (let i = 0; i < 7; i++) {
        const time = data.daily.time[i];
        const code = data.daily.weather_code[i];
        const minTemp = data.daily.temperature_2m_min[i];
        const maxTemp = data.daily.temperature_2m_max[i];
        
        const dateObj = new Date(time);
        
        // Get day name
        let dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
        if (i === 0) dayName = 'Today';
        
        const iconInfo = mapWMOCode(code, true);

        const item = document.createElement('div');
        item.className = 'daily-forecast-item';

        // Calculate visual range bars relative to current min/max
        const rangeWidth = Math.max(20, Math.min(100, (maxTemp - minTemp) * 3));
        const offsetLeft = Math.max(0, Math.min(80, (minTemp + 10) * 1.5)); // Arbitrary offsets for rendering

        item.innerHTML = `
            <span class="day-name">${dayName}</span>
            <div class="day-icon">
                <i data-lucide="${iconInfo.iconName}" style="color: ${iconInfo.theme === 'sunny' ? 'var(--accent-color)' : '#cbd5e1'};"></i>
            </div>
            <span class="day-condition">${iconInfo.description}</span>
            <div class="day-temp-range">
                <span class="min-temp">${Math.round(formatTempVal(minTemp))}&deg;</span>
                <div class="temp-bar-track">
                    <div class="temp-bar-fill" style="width: ${rangeWidth}px; left: ${offsetLeft}%"></div>
                </div>
                <span class="max-temp">${Math.round(formatTempVal(maxTemp))}&deg;</span>
            </div>
        `;

        DOM.dailyList.appendChild(item);
    }
}

// ==========================================================================
// TEMPERATURE UNIT MANAGER
// ==========================================================================
function setTemperatureUnit(unit) {
    if (state.tempUnit === unit) return;
    state.tempUnit = unit;
    localStorage.setItem('skyflow_temp_unit', unit);
    
    updateUnitToggleUI();
    
    // Refresh GUI using cache
    if (state.weatherDataCache) {
        renderWeatherDashboard(state.weatherDataCache);
    }
}

function updateUnitToggleUI() {
    DOM.unitC.classList.toggle('active', state.tempUnit === 'C');
    DOM.unitF.classList.toggle('active', state.tempUnit === 'F');
}

// Helper to convert Celsius database figures to active units
function formatTempVal(valCelsius) {
    if (state.tempUnit === 'C') {
        return valCelsius;
    } else {
        return (valCelsius * 9/5) + 32;
    }
}

// ==========================================================================
// FAVORITES & BOOKMARKS MODULE
// ==========================================================================
function toggleCurrentFavorite(e) {
    e.stopPropagation();
    const active = state.activeCoords;
    const index = state.favorites.findIndex(f => f.lat.toFixed(3) === active.lat.toFixed(3) && f.lon.toFixed(3) === active.lon.toFixed(3));
    
    if (index === -1) {
        // Add
        state.favorites.push({
            lat: active.lat,
            lon: active.lon,
            city: active.city,
            country: active.country
        });
        showToast(`${active.city} saved to Favorites.`, 'success');
    } else {
        // Remove
        state.favorites.splice(index, 1);
        showToast(`${active.city} removed from Favorites.`, 'info');
    }

    localStorage.setItem('skyflow_favorites', JSON.stringify(state.favorites));
    renderFavoritesDropdown();
    
    // Toggle active state on star
    DOM.saveLocationBtn.classList.toggle('active', index === -1);
}

function renderFavoritesDropdown() {
    DOM.favsList.innerHTML = '';
    
    if (state.favorites.length === 0) {
        DOM.favsList.innerHTML = '<p class="empty-favs">No saved cities yet.</p>';
        return;
    }

    state.favorites.forEach(fav => {
        const item = document.createElement('div');
        item.className = 'fav-item';
        
        item.innerHTML = `
            <div class="fav-details">
                <span class="fav-name">${fav.city}</span>
                <span class="fav-temp">${fav.country}</span>
            </div>
            <button class="remove-fav-btn" title="Remove Favorite">
                <i data-lucide="trash-2" style="width:14px; height:14px;"></i>
            </button>
        `;

        // Click on fav item triggers loading weather
        item.addEventListener('click', (e) => {
            if (e.target.closest('.remove-fav-btn')) return; // ignore delete click
            state.activeCoords = fav;
            localStorage.setItem('skyflow_active_location', JSON.stringify(fav));
            DOM.searchInput.value = fav.city;
            DOM.clearSearchBtn.classList.remove('hidden');
            DOM.favsDropdown.classList.add('hidden');
            DOM.favsToggleBtn.parentElement.classList.remove('open');
            fetchWeatherData(fav.lat, fav.lon);
        });

        // Click delete
        item.querySelector('.remove-fav-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            state.favorites = state.favorites.filter(f => !(f.lat === fav.lat && f.lon === fav.lon));
            localStorage.setItem('skyflow_favorites', JSON.stringify(state.favorites));
            renderFavoritesDropdown();
            
            // If deleting currently active, de-highlight main star
            if (state.activeCoords.lat === fav.lat && state.activeCoords.lon === fav.lon) {
                DOM.saveLocationBtn.classList.remove('active');
            }
            showToast(`${fav.city} removed.`, 'info');
            lucide.createIcons();
        });

        DOM.favsList.appendChild(item);
    });
    
    lucide.createIcons();
}

// ==========================================================================
// TRANSITIONS AND METEOROLOGICAL CALCULATORS
// ==========================================================================

// Maps the WMO precipitation code standard to descriptive names and themes
function mapWMOCode(code, isDay = true) {
    // Returns: { description: '', iconName: '', theme: '' }
    switch (code) {
        case 0:
            return {
                description: 'Clear Sky',
                iconName: isDay ? 'sun' : 'moon',
                theme: isDay ? 'sunny' : 'night'
            };
        case 1:
        case 2:
            return {
                description: 'Partly Cloudy',
                iconName: isDay ? 'cloud-sun' : 'cloud-moon',
                theme: isDay ? 'sunny' : 'night'
            };
        case 3:
            return {
                description: 'Overcast',
                iconName: 'cloud',
                theme: 'cloudy'
            };
        case 45:
        case 48:
            return {
                description: 'Foggy Conditions',
                iconName: 'cloud-fog',
                theme: 'cloudy'
            };
        case 51:
        case 53:
        case 55:
            return {
                description: 'Light Drizzle',
                iconName: 'cloud-drizzle',
                theme: 'rainy'
            };
        case 56:
        case 57:
            return {
                description: 'Freezing Drizzle',
                iconName: 'cloud-snow',
                theme: 'snowy'
            };
        case 61:
            return {
                description: 'Slight Rain',
                iconName: 'cloud-rain',
                theme: 'rainy'
            };
        case 63:
            return {
                description: 'Rainy',
                iconName: 'cloud-rain',
                theme: 'rainy'
            };
        case 65:
            return {
                description: 'Heavy Rain',
                iconName: 'cloud-rain-wind',
                theme: 'rainy'
            };
        case 66:
        case 67:
            return {
                description: 'Freezing Rain',
                iconName: 'cloud-snow',
                theme: 'snowy'
            };
        case 71:
            return {
                description: 'Light Snowfall',
                iconName: 'snowflake',
                theme: 'snowy'
            };
        case 73:
            return {
                description: 'Snowfall',
                iconName: 'snowflake',
                theme: 'snowy'
            };
        case 75:
            return {
                description: 'Heavy Snowfall',
                iconName: 'snowflake',
                theme: 'snowy'
            };
        case 77:
            return {
                description: 'Snow Grains',
                iconName: 'snowflake',
                theme: 'snowy'
            };
        case 80:
        case 81:
        case 82:
            return {
                description: 'Showers',
                iconName: 'cloud-rain',
                theme: 'rainy'
            };
        case 85:
        case 86:
            return {
                description: 'Snow Showers',
                iconName: 'cloud-snow',
                theme: 'snowy'
            };
        case 95:
            return {
                description: 'Thunderstorms',
                iconName: 'cloud-lightning',
                theme: 'stormy'
            };
        case 96:
        case 99:
            return {
                description: 'Storm with Hail',
                iconName: 'cloud-lightning',
                theme: 'stormy'
            };
        default:
            return {
                description: 'Unknown Conditions',
                iconName: 'cloud',
                theme: 'cloudy'
            };
    }
}

// Swaps body background classes to fit the theme
function applyWeatherTheme(themeClass) {
    const themePrefixes = ['theme-sunny', 'theme-rainy', 'theme-snowy', 'theme-cloudy', 'theme-stormy', 'theme-night'];
    themePrefixes.forEach(t => document.body.classList.remove(t));
    document.body.classList.add(`theme-${themeClass}`);
}

// Convert wind degrees into cardinal text
function getCompassDirection(deg) {
    const directions = ['North', 'Northeast', 'East', 'Southeast', 'South', 'Southwest', 'West', 'Northwest'];
    const idx = Math.round(deg / 45) % 8;
    return directions[idx];
}

// Calculate dew point using Magnus-Tetens approximation formula
function calculateDewPoint(temp, rh) {
    const a = 17.27;
    const b = 237.7;
    const alpha = ((a * temp) / (b + temp)) + Math.log(rh / 100.0);
    return (b * alpha) / (a - alpha);
}

// Get descriptions for UV rating ranges
function getUVLevelDescription(uv) {
    if (uv <= 2.9) return 'Low Risk. Low level threat.';
    if (uv <= 5.9) return 'Moderate. Sunscreen is advised.';
    if (uv <= 7.9) return 'High exposure! Protection required.';
    if (uv <= 10.9) return 'Very High. Minimize midday sun.';
    return 'Extreme risk! Stay indoors if possible.';
}

// Trend analyzer for atmospheric pressure
function getPressureTrend(hPa) {
    if (hPa > 1020) return 'High Pressure. Clear, calm skies.';
    if (hPa < 1009) return 'Low Pressure. Potential storms/rain.';
    return 'Standard pressure. Normal conditions.';
}

// Cloudiness summary text
function getCloudCoverDescription(cc) {
    if (cc < 10) return 'Scattered stars or clear sun.';
    if (cc < 30) return 'Mostly sunny/clear.';
    if (cc < 70) return 'Partly cloudy sky.';
    return 'Mostly overcast ceiling.';
}

// Formats a dynamic ISO date string into readable short hours
function formatTime(isoTimeStr, timezone) {
    try {
        const date = new Date(isoTimeStr);
        return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    } catch (e) {
        return '--:--';
    }
}

// ==========================================================================
// TOAST NOTIFICATIONS HELPER
// ==========================================================================
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let iconName = 'info';
    if (type === 'success') iconName = 'check-circle';
    if (type === 'error') iconName = 'alert-triangle';

    toast.innerHTML = `
        <i data-lucide="${iconName}"></i>
        <span>${message}</span>
    `;

    DOM.toastContainer.appendChild(toast);
    lucide.createIcons();

    // Trigger animation
    setTimeout(() => {
        toast.classList.add('show');
    }, 50);

    // Fade out and remove
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 4000);
}
