// grabbing the main interactive controls so i can attach events + read input
const form = document.getElementById("searchForm");
const input = document.getElementById("locationInput");
const statusEl = document.getElementById("status");
const unitButtons = document.querySelectorAll(".unit-toggle button");
const themeToggle = document.getElementById("themeToggle");

// these are the main UI fields that get updated after the API call
const placeEl = document.getElementById("place");
const summaryEl = document.getElementById("summary");
const tempEl = document.getElementById("temp");
const tempUnitEl = document.getElementById("tempUnit");
const feelsLikeEl = document.getElementById("feelsLike");
const humidityEl = document.getElementById("humidity");
const windEl = document.getElementById("wind");
const precipEl = document.getElementById("precip");
const moodIconEl = document.getElementById("moodIcon");
const moodTitleEl = document.getElementById("moodTitle");
const moodDetailEl = document.getElementById("moodDetail");
const sunriseEl = document.getElementById("sunrise");
const sunsetEl = document.getElementById("sunset");
const localTimeEl = document.getElementById("localTime");
const elevationEl = document.getElementById("elevation");
const coordsEl = document.getElementById("coords");
const forecastGrid = document.getElementById("forecastGrid");
const hourlyGrid = document.getElementById("hourlyGrid");
const sparkline = document.getElementById("sparkline");

// open-meteo gives a numeric weathercode, so i map it to something readable + a short icon tag
// if i wanna change the wording/icons later, i only touch this object
const weatherMap = {
  0: { label: "Crystal Clear", icon: "SUN" },
  1: { label: "Mostly Clear", icon: "SUN" },
  2: { label: "Soft Clouds", icon: "CLD" },
  3: { label: "Overcast", icon: "CLD" },
  45: { label: "Foggy", icon: "FOG" },
  48: { label: "Rime Fog", icon: "FOG" },
  51: { label: "Light Drizzle", icon: "DRZ" },
  53: { label: "Drizzle", icon: "DRZ" },
  55: { label: "Heavy Drizzle", icon: "DRZ" },
  56: { label: "Freezing Drizzle", icon: "ICE" },
  57: { label: "Icy Drizzle", icon: "ICE" },
  61: { label: "Light Rain", icon: "RAN" },
  63: { label: "Rain", icon: "RAN" },
  65: { label: "Heavy Rain", icon: "RAN" },
  66: { label: "Freezing Rain", icon: "ICE" },
  67: { label: "Icy Rain", icon: "ICE" },
  71: { label: "Light Snow", icon: "SNW" },
  73: { label: "Snow", icon: "SNW" },
  75: { label: "Heavy Snow", icon: "SNW" },
  77: { label: "Snow Grains", icon: "SNW" },
  80: { label: "Light Showers", icon: "RAN" },
  81: { label: "Showers", icon: "RAN" },
  82: { label: "Heavy Showers", icon: "RAN" },
  85: { label: "Snow Showers", icon: "SNW" },
  86: { label: "Heavy Snow Showers", icon: "SNW" },
  95: { label: "Thunderstorm", icon: "STO" },
  96: { label: "Storm + Hail", icon: "STO" },
  99: { label: "Severe Storm", icon: "STO" },
};

// app state stuff (this changes while the app runs)
let activeUnit = "c"; // if i ever want default fahrenheit, i would change this to "f"
let latestData = null; // i store the latest API response here so i can re-render (like when unit changes)
let localClockTimer = null; // used so i can clear the old timer when switching locations

// localStorage key for theme preference (if i rename the app, i might rename this too)
const themeStorageKey = "stormcraft-theme";

// quick helper for unit conversion
const toFahrenheit = (celsius) => (celsius * 9) / 5 + 32;

// formats temp based on current unit choice
// i return "--" when there’s no value so UI doesn’t look broken
const formatTemp = (value) => {
  if (value === null || value === undefined) return "--";
  const v = activeUnit === "f" ? toFahrenheit(value) : value;
  return `${Math.round(v)}°`;
};

// formats ISO time strings nicely, and supports forcing timezone
// if i want 24-hour time, i can add hourCycle or set locale options here
const formatTime = (iso, options = {}, timeZone) => {
  if (!iso) return "--";
  const date = new Date(iso);
  const formatOptions = {
    hour: "2-digit",
    minute: "2-digit",
    ...options,
  };
  if (timeZone) {
    formatOptions.timeZone = timeZone;
  }
  return new Intl.DateTimeFormat(undefined, formatOptions).format(date);
};

// draws the temperature trend line on the canvas
// i did this manually so i don’t need a chart library
const drawSparkline = (temps) => {
  const ctx = sparkline.getContext("2d");
  ctx.clearRect(0, 0, sparkline.width, sparkline.height);

  if (!temps.length) return;
  const padding = 16; // if i want the line closer to edges, i lower this
  const maxTemp = Math.max(...temps);
  const minTemp = Math.min(...temps);
  const range = maxTemp - minTemp || 1;

  // if i want a different color for the line, this is the only line to change
  ctx.strokeStyle = "rgba(124, 248, 255, 0.9)";
  ctx.lineWidth = 3;
  ctx.beginPath();

  temps.forEach((t, index) => {
    const x = padding + (index / (temps.length - 1)) * (sparkline.width - padding * 2);
    const y = padding + ((maxTemp - t) / range) * (sparkline.height - padding * 2);
    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });

  ctx.stroke();
};

// keeps the toggle UI in sync with activeUnit
// i separated this so unit switching stays clean
const updateUnitButtons = () => {
  unitButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.unit === activeUnit);
  });
  tempUnitEl.textContent = activeUnit === "f" ? "°F" : "°C";
};

// the main render function: takes latestData and updates everything on screen
// i call this after fetching weather + when switching units so it re-renders from stored data
const updateUI = () => {
  if (!latestData) return;

  const { location, weather } = latestData;
  const current = weather.current_weather;
  const hourly = weather.hourly;
  const daily = weather.daily;
  const timeZone = weather.timezone;

  // lining up "current" time with the hourly arrays so i can grab humidity/precip/feels-like correctly
const nowMs = new Date(current.time).getTime();

// find the first hourly slot that is >= now, then step back 1 so we start at the current hour block
let safeIndex = hourly.time.findIndex((t) => new Date(t).getTime() >= nowMs);
if (safeIndex === -1) safeIndex = 0;
if (safeIndex > 0) safeIndex -= 1;


  // pulling all the values i show in the cards
  const currentTemp = current.temperature;
  const feels = hourly.apparent_temperature[safeIndex];
  const humidity = hourly.relativehumidity_2m[safeIndex];
  const precip = hourly.precipitation_probability[safeIndex];
  const windSpeed = current.windspeed;

  // if the code isn't in my map, i show a fallback so UI still works
  const mood = weatherMap[current.weathercode] || { label: "Unknown", icon: "UNK" };

  // "Now" card text
  placeEl.textContent = `${location.name}, ${location.country}`;
  summaryEl.textContent = `${mood.label} · ${current.weathercode}`;
  tempEl.textContent = formatTemp(currentTemp).replace("°", ""); // i remove the symbol here because the unit is shown separately
  feelsLikeEl.textContent = formatTemp(feels);
  humidityEl.textContent = humidity !== undefined ? `${humidity}%` : "--";
  windEl.textContent = `${Math.round(windSpeed)} km/h`;
  precipEl.textContent = precip !== undefined ? `${precip}%` : "--";

  // "Sky Mood" badge
  moodIconEl.textContent = mood.icon;
  moodTitleEl.textContent = mood.label;
  moodDetailEl.textContent = `Weather code ${current.weathercode}`;

  // sunrise/sunset are daily arrays, index 0 = today
  sunriseEl.textContent = formatTime(daily.sunrise[0], {}, timeZone);
  sunsetEl.textContent = formatTime(daily.sunset[0], {}, timeZone);

  // meta cards (top)
  localTimeEl.textContent = formatTime(current.time, {}, timeZone);
  elevationEl.textContent = `${Math.round(weather.elevation)} m`;
  coordsEl.textContent = `${location.latitude.toFixed(2)}, ${location.longitude.toFixed(2)}`;

  // rebuilding the forecast cards each time (simple + reliable)
  forecastGrid.innerHTML = "";
  daily.time.slice(0, 5).forEach((day, index) => {
    const card = document.createElement("div");
    card.className = "forecast-card";
    card.style.setProperty("--delay", `${index * 0.06}s`);

    const moodDay = weatherMap[daily.weathercode[index]] || { label: "Mystery", icon: "UNK" };

    // i do T12:00:00 so the weekday doesn’t shift because of UTC parsing weirdness
    const safeDay = new Date(`${day}T12:00:00`);

    card.innerHTML = `
      <h4>${safeDay.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</h4>
      <div class="forecast-meta">
        <span>${moodDay.icon} ${moodDay.label}</span>
      </div>
      <div class="forecast-meta">
        <span>High ${formatTemp(daily.temperature_2m_max[index])}</span>
        <span>Low ${formatTemp(daily.temperature_2m_min[index])}</span>
      </div>
      <div class="forecast-meta">
        <span>Precip ${daily.precipitation_probability_max[index]}%</span>
      </div>
    `;

    forecastGrid.appendChild(card);
});


  // next 12 hours cards
  hourlyGrid.innerHTML = "";
  const hourlySlice = hourly.time.slice(safeIndex, safeIndex + 12);
  hourlySlice.forEach((time, index) => {
    const card = document.createElement("div");
    card.className = "hour-card";

    // same animation trick as the forecast cards
    card.style.setProperty("--delay", `${index * 0.04}s`);

    const weatherCode = hourly.weathercode[safeIndex + index];
    const moodHour = weatherMap[weatherCode] || { label: "Mystery", icon: "UNK" };
    card.innerHTML = `
      <p>${formatTime(time)}</p>
      <p>${moodHour.icon} ${formatTemp(hourly.temperature_2m[safeIndex + index])}</p>
      <p>${hourly.precipitation_probability[safeIndex + index]}% precip</p>
    `;
    hourlyGrid.appendChild(card);
  });

  // sparkline uses the same 12-hour temps so it matches the hourly section
  const sparkTemps = hourly.temperature_2m.slice(safeIndex, safeIndex + 12);
  const sparkTempsUnit = activeUnit === "f" ? sparkTemps.map(toFahrenheit) : sparkTemps;
  drawSparkline(sparkTempsUnit);

  // keeping the "Local Time" card accurate (updates once a minute)
  if (localClockTimer) {
    clearInterval(localClockTimer);
  }
  localClockTimer = setInterval(() => updateLocalClock(timeZone), 60000);
  updateLocalClock(timeZone);
};

// updates the local time card based on timezone returned by the API
// i do this so Toronto vs Tokyo shows correct time without extra libraries
const updateLocalClock = (timeZone) => {
  if (!timeZone) return;
  const now = new Date();
  localTimeEl.textContent = new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  }).format(now);
};

// fetch flow: user types a place -> geocode -> get lat/long -> fetch weather -> update UI
// i separated this so submit handler stays small
const fetchWeather = async (query) => {
  statusEl.textContent = "Scanning the atmosphere...";

  // geocoding: turning a city name into coordinates
  const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`;
  const geoResponse = await fetch(geoUrl);
  const geoData = await geoResponse.json();

  if (!geoData.results || !geoData.results.length) {
    throw new Error("No matches found. Try another place.");
  }

  const location = geoData.results[0];

  // weather endpoint: i list all hourly/daily variables i need here
  // if i want more data (like pressure), i would add it to hourly=... and then read it in updateUI
  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&current_weather=true&hourly=temperature_2m,apparent_temperature,precipitation_probability,weathercode,relativehumidity_2m,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,weathercode,precipitation_probability_max,sunrise,sunset&timezone=auto`;
  const weatherResponse = await fetch(weatherUrl);
  const weather = await weatherResponse.json();

  // storing it so unit switch re-renders without refetching
  latestData = { location, weather };
  statusEl.textContent = `Locked on ${location.name}, ${location.country}.`;
  updateUI();
};

// submit handler: prevents page reload and runs fetchWeather
// i keep this thin so error handling is clean
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const query = input.value.trim();
  if (!query) return;

  try {
    await fetchWeather(query);
  } catch (error) {
    statusEl.textContent = error.message || "Weather scan failed.";
  }
});

// unit toggle buttons
// i re-render UI after switching so every value updates to the new unit
unitButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeUnit = button.dataset.unit;
    updateUnitButtons();
    updateUI();
  });
});

// initial setup on page load
updateUnitButtons();
fetchWeather("Toronto").catch(() => {
  statusEl.textContent = "Enter a city to start.";
});

// theme function: sets data-theme so CSS swaps variables
// if i change the text here, it changes the button label only
const applyTheme = (theme) => {
  document.body.dataset.theme = theme;
  themeToggle.textContent = theme === "light" ? "Dark mode" : "Light mode";
};

// try to load saved theme first; otherwise use system preference
const savedTheme = localStorage.getItem(themeStorageKey);
const systemPrefersLight = window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches;
applyTheme(savedTheme || (systemPrefersLight ? "light" : "dark"));

// toggles theme and saves it so it stays after refresh
themeToggle.addEventListener("click", () => {
  const currentTheme = document.body.dataset.theme === "light" ? "light" : "dark";
  const nextTheme = currentTheme === "light" ? "dark" : "light";
  localStorage.setItem(themeStorageKey, nextTheme);
  applyTheme(nextTheme);
});
