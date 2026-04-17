# TerpNav Project Context

## Overview
UMD building navigator. Helps students find campus buildings by acronym (IRB, ESJ, HBK) with Google Maps directions. Solves freshman navigation problem. This is also a learning experience for me. As we develope this app I want to learn how to do the thing we are doing you must teach me so I can learn how to do all these task by myself and also improve my skills as a programmer. I want to build experience and skills for future internship positions relating to fullstack development.

## Tech Stack
- Frontend: React 19, Vite, React Router v6, CSS Modules
- Backend: Flask (planned), PostgreSQL (planned), JWT (planned)
- APIs: Google Maps

## Current State
### Done
- Home page with Hero search
- Buildings page (`/buildings`) with live filter (acronym/name/department)
- Building detail pages
- Navbar, BuildingCard, CSS Modules (UMD red/gold theme)
- Input sanitization, no `dangerouslySetInnerHTML`
- PascalCase file naming

### In Progress
- Saved.jsx and Profile.jsx are empty shells
- Backend not started
- PostgreSQL installed locally but not configured
- API intergration to fill buildings.json automatically from the website without having to manually input information

## File Structure
If files are not found are not in the right order only view the folder structure dont do uneeded actions.
src/
├── pages/
│ ├── Home.jsx
│ ├── Buildings.jsx (filter logic done)
│ ├── BuildingDetail.jsx
│ ├── Saved.jsx (empty)
│ └── Profile.jsx (empty)
├── components/
│ ├── Navbar.jsx
│ ├── Hero.jsx
│ ├── BuildingCard.jsx
│ └── BuildingsGrid.jsx
└── data/
└── buildings.json (7 buildings)

# TOKEN RULES
- Brief replies. Bullets > paragraphs.
- Abbr: bldg=building, acro=acronym, dept=department.
- Code: show changed lines only.
- Skip explanations unless I ask "explain".
- No fluff, no summaries.
