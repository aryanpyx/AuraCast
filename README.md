<p align="center">
  <img src="https://raw.githubusercontent.com/aryanpyx/AuraCast/ebfbc0c60968418e8989f10404df4eca11a30246/OSCI_Project_Banner.png" alt="Open Source Banner" />
</p>

# 🌍 AuraCast - AI-Powered Air Quality Forecasting

AuraCast is a next-gen air quality monitoring app that provides **hyperlocal AQI data** and **AI-powered 24-hour forecasts** for Lucknow, India. Built with modern UI/UX principles, real-time map interactivity, and LSTM-based predictions, AuraCast offers a complete, mobile-friendly dashboard to analyze, forecast, and understand air pollution zone by zone.

---
## 👋 Hello, Contributors!

If you are reading this, welcome! Here’s what you are contributing:

- This project shows **real-time air quality for Lucknow**.
- Your contributions might include **fixing typos**, **improving instructions**, or **adding features**.
- Don’t worry if you’re new — small changes like README improvements **count as your first contribution**!
- Everything you write here will help other users understand AuraCast better.

Thank you for helping improve this project! 💡

---

<details>
  <summary><strong>📑 Table of Contents</strong></summary>

  - [✨ Key Features](#-key-features)
  - [🛠️ Tech Stack](#️-tech-stack)
  - [🚀 How to Use](#-how-to-use)
  - [🗺️ Sample Zones to Try](#️-sample-zones-to-try)
  - [🧪 Simulated AI + Live Convex Data](#-simulated-ai--live-convex-data)
  - [🧭 Known UX Details](#-known-ux-details)
  - [🧾 License](#-license)
  - [👋 Final Note](#-final-note)

</details>

---

## ✨ Key Features

### 🗺️ Interactive AQI Map
- Real-time AQI data for **8 microzones** in Lucknow
- Color-coded overlays with **hover tooltips**
- **Wind direction indicators** and animated pulsing for high AQI zones
- Zones include areas like **Hazratganj**, **Gomti Nagar**, and **Aminabad**

### 🤖 AI-Powered Forecasting
- 24-hour AQI forecasts using simulated **LSTM neural network**
- Captures realistic trends (e.g., **rush hour spikes**, nighttime drops)
- Interactive line charts with **confidence indicators**
- Forecast panel for selected zones with `"🤖 Generate"` button

### 💡 Health Recommendations
- Dynamic suggestions based on zone-level AQI
- Separate tabs for **Tips**, **Activities**, and **Precautions**
- Emergency alerts for **hazardous levels** (AQI 200+)
- Smart advice tailored to **children, elderly, and outdoor workers**

### 📊 Detailed Pollutant Analysis
- Realtime data for: **PM2.5**, **PM10**, **NO₂**, **SO₂**, **O₃**, **CO**
- Interactive bar charts with **tooltips and progress bars**
- Visual comparison with **safe thresholds**
- Integrated weather context (humidity, temperature, wind)

### 🎨 Modern UI/UX
- **Glassmorphism interface** with blurred backgrounds
- Smooth transitions using **Framer Motion**
- Fully responsive for **mobile, tablet, and desktop**
- Elegant **dark mode** with neon gradient accents

---

## 🛠️ Tech Stack

| Layer         | Tech Used                            |
|---------------|---------------------------------------|
| Frontend      | React 19, TypeScript, Vite            |
| Backend       | [Convex](https://convex.dev) (serverless DB + functions) |
| Auth          | Convex Auth                           |
| Styling       | TailwindCSS + Custom CSS              |
| Animations    | Framer Motion                         |
| Charts        | Recharts                              |

> ⚠️ No traditional backend server (FastAPI/Node) is used — Convex handles real-time DB & logic.

---

## 🚀 How to Use

1. **Sign In**: Use username/password to create an account.
2. **Explore Map**: Click any of the 8 colored zones to view details.
3. **Generate Forecast**: Click `"🤖 Generate"` in the forecast panel.
4. **View Health Tips**: Get smart suggestions based on AQI level.
5. **Analyze Pollutants**: Dive deep into pollutant data & weather context.

---

## Quick Start for Contributors 🧹

Get AuraCast running locally in just a few steps!

1. **Clone the Repository**  
   ```bash
   git clone https://github.com/aryanpyx/AuraCast.git
   cd AuraCast

2. **Install Dependencies**
   Ensure you have Node.js (v16 or higher) installed, then run:
   ```bash
   npm install

3. **Set Up Convex**
   Sign up for a free account at Convex.
   Create a new project and get your CONVEX_URL from the Convex dashboard.
   Create a .env file in the project root with:
   
   env

   VITE_CONVEX_URL=your_convex_url_here

4. **Run the Development Server**
   ```bash
   npm run dev

   Open http://localhost:5173 in your browser to view AuraCast.


5. **Start Contributing**

   Explore the codebase, make changes, and test locally.
   Submit your changes via a pull request (see GitHub’s guide).


  **Tip**: Ensure you have a GitHub account to fork and contribute. Check the Convex documentation for setup help. 

---

## 🗺️ Sample Zones to Try

| Zone                  | AQI Level   | Status      |
|-----------------------|-------------|-------------|
| Hazratganj Central    | 156         | Unhealthy   |
| Mahanagar Green Zone  | 87          | Moderate    |
| Charbagh Railway Area | 189         | Unhealthy   |
| Gomti Nagar Extension | 122         | Poor        |

Each zone is seeded with unique data and realistic weather/pollutant conditions.

---

## 🧪 Simulated AI + Live Convex Data

- AQI forecasts mimic **LSTM model behavior** (diurnal cycles, prediction confidence).
- Data (zones, pollutants, forecasts, health tips) are stored and retrieved via **Convex functions**.
- All interactions (map clicks, zone selection) update in real time without reloading.

---

## 🧭 Known UX Details

- If no zone is selected, a `"Welcome to AuraCast"` overlay appears.
- Signing in removes this and unlocks the full dashboard.
- You can **dismiss the welcome message** after selecting a zone.

---

## 🧾 License

This project is released under the [MIT License](LICENSE).  
Free to use, fork, and modify for personal or academic use.

---

## 👋 Final Note

AuraCast is a showcase of how **real-time databases, AI, and stunning UI/UX** can combine into a powerful environmental dashboard.  
Built by **Aryan Pandey** with ♥️ to make air quality more visible, local, and actionable.

---