# Google Maps-Style Fleet Icons, Smooth Marker Motion & 1-Hour Trail

Upgrade the fleet tracking map experience with Google Maps-inspired top-down rotatable vehicle icons and equipment badge icons selectable via Device Attributes, smooth real-time marker interpolation between GPS updates, and an automatic 1-hour movement trail whenever a vehicle is selected—while keeping the standard interface completely unchanged.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following design and functional choices have been confirmed from your answers and will guide the implementation:

- **Confirmed Decision 1 — Icon Visual Style & Rotation**: Vehicle and mobile machinery icons (**Car**, **Tradie Ute with canopy**, **EWP**, **Trailer**, **Machinery**) will use Google Maps-style top-down silhouettes that rotate smoothly with the vehicle's GPS course/heading. Portable device and equipment icons (**iPhones**, **iPads**, **Test Equipment**) will render as crisp circular Google Maps-style badge pins that remain upright for instant legibility.
- **Confirmed Decision 2 — Icon Selection via Device Attributes**: A dedicated **Device Icon** (`deviceIcon`) attribute will be available in the Device Attributes section. When added or edited in the attributes accordion, it renders a dropdown selector populated with the 8 custom icon types (plus default category fallback) rather than requiring manual text entry.
- **Confirmed Decision 3 — 1-Hour Selected Vehicle Trail**: Selecting any vehicle on the map or in the device list automatically fetches and renders its last 1 hour of movement as a clean, Google Maps-style colored route line on the map, clearing automatically when the vehicle is deselected.

---

## 1. Overview & Core Concept

- **What It Does**: Enhances the tracking map with realistic top-down vehicle graphics and equipment badges stored in system image assets, allows administrators/users to assign icons via a dropdown in Device Attributes, animates marker transitions smoothly across coordinates and headings, and draws the selected asset's past 60 minutes of travel on the map.
- **Target Audience / Persona**: Fleet managers, field service dispatchers, and operations teams tracking tradie utes, elevated work platforms (EWPs), trailers, heavy machinery, test equipment, iPhones, and iPads.
- **Key Value**: Delivers the familiar, high-clarity visual feedback of Google Maps navigation—smoothly gliding vehicles, recognizable trade/fleet silhouettes, and immediate 1-hour route context—without altering existing workflows or UI layouts.

---

## 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Assigning an Icon in Device Attributes**: The user opens a device's settings, expands the **Attributes** accordion, clicks **Add**, selects **Device Icon**, and chooses from the dropdown menu (*iPhones*, *iPads*, *Car*, *Tradie Ute with canopy*, *EWP*, *Trailer*, *Machinery*, *Test Equipment*). Saving the device immediately updates its icon on the map and in the sidebar device list.
  2. **Watching Live Fleet Movement**: As new GPS positions arrive over the WebSocket connection, markers smoothly glide from their previous coordinates to the new coordinates and interpolate their heading angle seamlessly instead of jumping abruptly.
  3. **Inspecting 1-Hour Vehicle History**: Clicking a vehicle in the device list or directly on the map highlights the vehicle, opens the standard status card, and immediately draws a clean colored polyline showing the vehicle's path over the last 60 minutes. Deselecting the vehicle removes the 1-hour trail.
- **Visual Identity & Theme**:
  - *Aesthetic Direction*: Preserves the native Material UI layout and existing light/dark theme tokens (`--primary`, `--success`, `--error`, `--neutral`) with zero unnecessary UI changes.
  - *Color Palette & Mood*: Status colors (online green, offline red, unknown/neutral grey, info blue) are integrated into the icon accents/badges so operators can still read connection status at a glance while enjoying detailed top-down Google Maps-style vehicle rendering.
  - *Route Trail Styling*: Uses a clean, rounded-cap Google Maps blue (`#1a73e8` or the device's configured report color) polyline with a subtle outer casing for high contrast over both street and satellite map layers.
- **Interactive Feedback & Motion**:
  - `requestAnimationFrame`-driven coordinate and bearing interpolation ensures 60fps marker gliding between position packets.
  - Shortest-arc angle interpolation prevents markers from spinning 350° when crossing the 0°/360° north boundary.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Top-Down Rotatable Vehicles vs. Upright Equipment Badges**
  - *Chosen Approach*: Render **Car**, **Tradie Ute with canopy**, **EWP**, **Trailer**, and **Machinery** as top-down rotatable map symbols aligned with the map bearing and vehicle course; render **iPhones**, **iPads**, and **Test Equipment** as upright circular badge markers.
  - *Why*: Vehicles have a natural forward heading that looks realistic when aligned with roads like Google Maps navigation, whereas handheld electronics and test cases look clearest when upright.
  - *Alternatives Considered*: Rotating all icons (makes phone/tablet icons hard to read when upside-down) or keeping all icons inside static circles (loses the Google Maps vehicle feel).
- **Decision 2: Client-Side `requestAnimationFrame` Interpolation for Smooth Movement**
  - *Chosen Approach*: Maintain an interpolated positions state layer between the Redux live position store and the MapLibre GeoJSON source, smoothly easing latitude, longitude, and course over a configurable transition window when a device's position updates.
  - *Why*: Works seamlessly with MapLibre GL symbol layers, clustering, and real-time WebSocket updates without breaking marker click handlers or overlays.
  - *Alternatives Considered*: CSS transitions on HTML DOM markers (breaks native MapLibre WebGL symbol clustering and degrades performance with many devices).
- **Decision 3: On-Demand 1-Hour Position Query on Selection**
  - *Chosen Approach*: When `selectedDeviceId` changes, query the `/api/positions` endpoint for the time window `[now - 1 hour, now]` and render the resulting coordinates in a dedicated map line layer.
  - *Why*: Shows the exact 1-hour historical path even if the user just opened the browser tab (unlike in-memory session history which only knows about points received since page load).

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

- **Architecture & Component Diagram**:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Device Settings & Attributes                     │
│  ┌─────────────────────────┐       ┌─────────────────────────────────┐  │
│  │ Device Attributes Hook  │──────▶│   Edit Attributes Accordion     │  │
│  │ (Defines `deviceIcon`   │       │ (Renders Select Dropdown for    │  │
│  │  with 8 Icon Options)   │       │  Attributes with `options` Map) │  │
│  └─────────────────────────┘       └────────────────┬────────────────┘  │
└─────────────────────────────────────────────────────┼───────────────────┘
                                                      │ Saves `attributes.deviceIcon`
                                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         Redux Store (`devices` & `session`)             │
└──────────────┬──────────────────────────────────────┬───────────────────┘
               │ Live Position Updates                │ `selectedDeviceId`
               ▼                                      ▼
┌────────────────────────────────────┐  ┌─────────────────────────────────┐
│   Smooth Position Interpolator     │  │  1-Hour Selected Vehicle Trail  │
│ (`requestAnimationFrame` LERP for  │  │ (Fetches `/api/positions` for   │
│  lat, lng & shortest-arc course)   │  │  `now - 1h` to `now` & renders  │
└──────────────┬─────────────────────┘  │  clean Google Maps polyline)    │
               │                        └─────────────┬───────────────────┘
               ▼                                      │
┌─────────────────────────────────────────────────────┴───────────────────┐
│                         Main Map & MapLibre Layers                      │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ System Icon Assets (8 Custom SVG Icons + Preload Pipeline)        │  │
│  │ • Rotatable Top-Down: Car, Tradie Ute, EWP, Trailer, Machinery    │  │
│  │ • Upright Badges: iPhones, iPads, Test Equipment                  │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

- **Data Model & State**:
  - **Device Attribute (`device.attributes.deviceIcon`)**: Stores the selected icon key (`iphone`, `ipad`, `car`, `tradieUte`, `ewp`, `trailer`, `machinery`, `testEquipment`). Falls back to `device.category` if `deviceIcon` is not set, and defaults the `car` icon to the new Google Maps-style top-down car graphic.
  - **System Icon Registry**: All 8 SVG graphics are stored in the system image resources folder and preloaded into MapLibre's sprite/image cache across status color variants (`info`, `success`, `error`, `neutral`).
  - **Interpolation State**: Tracks `{ startLat, startLng, startCourse, targetLat, targetLng, targetCourse, startTime, duration }` per `deviceId` and outputs interpolated positions at 60fps.
  - **Selected 1-Hour Route State**: Holds the array of historical positions for `selectedDeviceId` over the trailing 60 minutes, refreshed when selection changes or new live positions arrive for the selected vehicle.
- **Interactive Component & State Mapping**:
  - **Attribute Dropdown Selection**: In the attributes editor, any attribute definition containing an `options` list automatically renders a Material UI `Select` dropdown instead of a plain text input, saving the selected icon key into `item.attributes.deviceIcon`.
  - **Marker Rotation & Alignment**: Top-down vehicle icons set `iconRotate` to the interpolated `course` with map-aligned rotation, while upright equipment badges keep `iconRotate: 0` so they stay level.
  - **1-Hour Trail Lifecycle**: Selecting a device triggers an asynchronous fetch for `/api/positions?deviceId=<id>&from=<now-1h>&to=<now>`. An AbortController cancels stale requests if the user rapidly switches between vehicles. Live position updates for the currently selected device append to the trail and prune points older than 1 hour.
