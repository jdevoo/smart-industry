# IMES (Intelligent Manufacturing Execution System)

IMES is an open-source, high-performance Manufacturing Execution System (MES) designed specifically for Small-to-Midsize JobShop Manufacturers. It enables factories to transition from legacy paper-based workflows to a highly optimized, automated, and digital shopfloor ecosystem.

<div align="center">

[![Framework - Lit](https://img.shields.io/badge/Framework-Lit_3-blue.svg)](https://lit.dev/)
[![Language - TypeScript](https://img.shields.io/badge/Language-TypeScript_5-blue.svg)](https://www.typescriptlang.org/)
[![Build Tool - Vite](https://img.shields.io/badge/Build_Tool-Vite_5-green.svg)](https://vitejs.dev/)
[![Database - Firebase](https://img.shields.io/badge/Database-Firebase_v10-orange.svg)](https://firebase.google.com/)
[![License - Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-yellow.svg)](https://opensource.org/licenses/Apache-2.0)

</div>

---

## 🚀 The Modern Architecture

In 2026, the IMES codebase was fully modernized, moving away from legacy Polymer 2.x components and Bower package management to a highly efficient web standards stack:

*   **Component Architecture:** Written entirely in **Lit 3** and **TypeScript** using standard ES Modules (ESM).
*   **Asset Pipeline:** Handled by **Vite 5**, offering instant Hot Module Replacement (HMR) and optimized manual chunk-splitting for vendor files.
*   **State & Dependency Injection:** Leverages standardized **`@lit/context`** providers to seamlessly distribute user profiles, active company database references, and shopfloor states downstream without prop-drilling or bulky state libraries.
*   **Database & Auth API:** Uses the **Modular Firebase Web JS SDK (v10)**, allowing fine-grained tree-shaking of Realtime Database and Auth modules.
*   **Live Data Synchronization:** Handled via custom **Lit Reactive Controllers** (`FirebaseDocController` and `FirebaseQueryController`) which bind component lifecycles to Firebase listeners, automatically cleaning up database connections when components unmount.
*   **User Interface:** Styled using Google's **Material 3 (M3) Web Components** (`@material/web`) and high-density, performant **Vaadin Grids** (`@vaadin/grid`) to fit dense industrial dashboard requirements.
*   **PWA and Offline Capabilities:** Configured with **Workbox** (via `vite-plugin-pwa`) to support deep offline caching for shopfloor terminals, safeguarding execution data during network disconnects.

---

## 🚧 Project Timeline & Roadmap

### Software Engineering Achievements
- [x] Migrate legacy Polymer 2 framework and Bower elements to Lit 3 and npm.
- [x] Fully transition source files to clean, strongly-typed TypeScript.
- [x] Integrate modern Modular Firebase Web JS SDK (v10).
- [x] Write custom Firebase Reactive Controllers for declarative database bindings.
- [x] Implement global authentication context tracking using `@lit/context`.
- [x] Scaffold modern layout navigation, responsive sidebar drawers, and high-fidelity routing.
- [x] Implement secure registration with automatic fetch-based sample database seeding.
- [x] Establish a modern, fast Unit Testing suite using Vitest and Happy DOM.

### Production Engineering Roadmap & Aspirations
- [ ] **Dynamic Production Simulator Engine:** Visual timeline mapping (Gantt-based) representing job-shop operational sequences before dispatching to the floor.
- [ ] **Live Shopfloor Progress Board:** High-density, real-time feedback board matching pending steps against live machine states.
- [ ] **Advanced Scheduling Optimization:** Complete the integration of linear programming (using `javascript-lp-solver`) to compute constraint-bound asset utilization alongside heuristics.
- [ ] **Telemetry Machine/Sensor Counter Integrations:** Enhance physical IoT tracker couplings to automatically complete shopfloor runs.

---

## 📚 About IMES Project & Implementation Theory

A Manufacturing Execution System (MES) involves using computing resources to track, record, and optimize the entire manufacturing journey—from raw materials to finished products. 

While conventional MES software is costly and complex, IMES provides an affordable, "intelligent" MES tailored for small-to-midsize job-shops. By applying mathematical planning and real-time shopfloor telemetry tracking, IMES helps factory owners make data-driven scheduling decisions and drive down production costs.

### Core Mathematical & Operational Principles

#### 1. Resource Usage Optimization using Linear Programming (LP)
Linear programming is targeted to solve resource constraint optimization problems. When given linear capacity bounds (e.g., maximum machine operational hours, limited raw material volume, labor shifts), the system can formulate inequalities to maximize throughput yield or minimize production latency.

#### 2. Overall Equipment Effectiveness (OEE)
OEE is a key performance indicator used to measure manufacturing productivity. It breaks down machine operations into three key performance pillars:
*   **Availability:** Monitors running time against planned production time, accounting for unplanned downtime.
*   **Performance:** Measures current production speed against the machine's designed cycle speed.
*   **Quality:** Evaluates the count of good parts produced versus defective/scrap parts.

$$\text{OEE} = \text{Availability} \times \text{Performance} \times \text{Quality}$$
$$\text{Simplified Operational OEE} = \frac{\text{Good Count} \times \text{Ideal Cycle Time}}{\text{Planned Production Time}}$$

#### 3. JobShop Scheduling Heuristics
Job-shop environments feature diverse product configurations where different parts follow unique routings across physical workstations. To solve the NP-hard problem of scheduling these jobs efficiently, the IMES engine applies hybrid dispatching rules:
*   **Earliest Due Date (EDD):** Prioritizes orders based on the delivery due date, minimizing late deliveries.
*   **Shortest Processing Time (SPT):** Prioritizes operations that take the least amount of time, maximizing inventory turnover and reducing average work-in-progress (WIP) build-up.
*   **Workload-Based Machine Allocation:** Dynamically computes station workloads using functional reductions (via `ramda` matrices), determining proportional machine parallelization ratios to scale operations safely.

---

## 🛠 Developer Guide

### Prerequisites
*   **NodeJS:** Version `>= 18.x`
*   **npm:** Version `>= 9.x`

### Local Installation
1. Clone the repository and navigate to the project root:
   ```bash
   git clone https://github.com/jukbot/smart-industry.git
   cd smart-industry
   ```
2. Install all modern dependencies from npm:
   ```bash
   npm install
   ```

### 🔥 Firebase Backend Setup
This application utilizes a Firebase Realtime Database and Email Authentication backend. Thanks to our custom **auto-seeding engine**, setting up your backend database requires zero manual data insertion:

1. **Create a Firebase Project:** Go to the [Firebase Console](https://console.firebase.google.com/) and create a new project.
2. **Enable Authentication:** Navigate to **Build > Authentication** -> **Get Started**, choose **Email/Password**, and click **Enable**.
3. **Enable Realtime Database:** Navigate to **Build > Realtime Database**, click **Create Database**, choose a server location, and start in **locked/test mode**.
4. **Publish Security Rules:** Go to your Realtime Database **Rules** tab, paste the rules defined in `database.rules.json` from the project root, and click **Publish**.
5. **Get App Credentials:** Go to your Project Overview dashboard, click the web icon (`</>`) to register a new Web App, and copy the `firebaseConfig` credentials object.
6. **Configure the Project:** Open **`src/config/firebase.ts`** and replace the `firebaseConfig` constants with your copied credentials.
7. **Boot and Auto-Seed:** Run `npm run dev` to start the app, go to `http://localhost:5173/`, click **Sign Up**, and register a new account. Our seeder will automatically create your siloed company node and populate it with the rich sample factory schema!

### Command Console

| Action | Command | Purpose |
| :--- | :--- | :--- |
| **Development** | `npm run dev` | Runs the Vite local server with Hot Module Replacement at `http://localhost:5173`. |
| **Production Build** | `npm run build` | Runs Typechecking (`tsc`) and compiles minified, chunk-split production static assets inside the `dist/` folder. |
| **Local Preview** | `npm run preview` | Spins up a local production server to test the performance of the compiled bundle. |

---

## 💻 Deployment

The compiled output inside `dist/` consists of purely static, heavily optimized HTML, CSS, and JS modules, combined with a progressive web app Service Worker (Workbox).

This bundle can be served globally on any static web host:
*   **Firebase Hosting:** Deploy instantly using the Firebase CLI (`firebase deploy`). Rewrites are configured to map single-page paths (`/app/**`) back to `/index.html` seamlessly.
*   **Nginx Reverse Proxy:** Easily served with high HTTP/2 or HTTP/3 multiplexing and caching strategies to terminals and tablets on the shopfloor.

---

## 👥 Contribution & Feedback

If you encounter bugs, want to suggest features, or help refine the mathematical scheduling algorithms, please open an issue or pull request. Contributions to further modernizing the code or finalizing the stubs are always welcome!

## 📄 License

Licensed under the **Apache License, Version 2.0**.

```text
Copyright 2016-2018 Chukkrit Visitsaktavorn

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
```

