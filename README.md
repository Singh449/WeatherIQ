# WeatherIQ 🌤️

WeatherIQ is a clean, cinematic weather web app that lets you search any location and instantly view:
- Current conditions (temp, feels like, humidity, wind, precip)
- A 5-day forecast
- The next 12 hours
- Sunrise / sunset + a small temperature sparkline

Built with **HTML + CSS + Vanilla JavaScript**, powered by **Open-Meteo**.

---

## Live Preview
https://singh449.github.io/WeatherIQ/

---

## Features
- 🔎 Location search using Open-Meteo Geocoding
- 🌡️ Celsius / Fahrenheit toggle
- 🌙 Light / Dark mode toggle (saved in localStorage)
- 📈 Canvas sparkline for hourly temperature trend
- 🎬 Smooth animations + glassmorphism UI

---

## Tech Stack
- **HTML5**
- **CSS3** (Grid/Flexbox, CSS variables, animations)
- **JavaScript (ES6+)** (Fetch API, DOM updates, Canvas)
- **Open-Meteo API**
  - Geocoding API (place → coordinates)
  - Forecast API (current, hourly, daily)

---

## Project Structure
```txt
weatheriq/
├─ index.html
├─ styles.css
└─ app.js
