---
title: Atlas of Data Center Politics
contributors:
- Justin Kollar
dateLabel: 2026—
order: 1
published: true
description: <p>The Atlas of Data Center Politics is a research database and interactive spatial interface for examining data centers as political and infrastructural objects. It links facility records to political events, legislation, actors, and administrative geography, allowing users to move between individual projects and wider territorial patterns. The project focuses on how digital infrastructure reorganizes land, electricity, water, public authority, and development policy, while creating a transparent record of the sources and relationships behind mapped information.</p>
duration: 2026—present
page: true
theme:
  lightBackground: '#f4f4f0'
  lightText: '#171717'
  lightMuted: '#62686b'
  lightSmall: '#7d8183'
  lightLine: '#c8cbcc'
  lightSoft: '#e8e9e5'
  darkBackground: '#1d2028'
  darkText: '#f3f2f2'
  darkMuted: '#a9adaa'
  darkSmall: '#8d9395'
  darkLine: '#46515a'
  darkSoft: '#252a31'
hero:
  type: atlas-globe
  buttonLabel: Open the Atlas of Data Center Politics
  buttonUrl: '#'
  intro: A research atlas for examining data centers, political events, legislation, and the infrastructures that connect them across territory. The Atlas links individual records to geography so users can move between projects, jurisdictions, and broader patterns of land, energy, water, and governance.
modules:
- type: text
  heading: About
  body: '<p>The Atlas treats data centers as political and infrastructural objects rather than isolated facilities. It brings together data-center campuses, political events, legislation, actors, administrative geography, and selected infrastructure context in a single research interface.</p><p>Its purpose is comparative: to help researchers examine how data-center development is governed across places, how conflicts and policies accumulate around particular projects, and how digital infrastructure reorganizes land, resources, and public authority.</p>'
- type: accordion
  heading: Data & Methodology
  intro: The Atlas is built from linked record families rather than a single flat dataset. Documentation below describes what is included, how records are related, and where uncertainty or uneven coverage remains.
  items:
  - title: Datasets
    body: <p>Data Centers records campuses, project status, operator, capacity class, location, and source information. Political Events records dated permitting, opposition, utility, public-process, and project decisions. Legislation records data-center-related bills, policy categories, status, and jurisdiction. Actors and Geography provide canonical organizations and administrative units used to connect these records.</p>
  - title: Sources
    body: <p>Sources may include government documents, legislation, planning and permitting records, utility filings, company disclosures, project websites, technical reports, news reporting, and academic or civil-society research. Source information remains attached to records wherever possible.</p>
  - title: Data model
    body: <p>Canonical records use persistent IDs and explicit relationships. A political event may relate to multiple data centers, actors, geographies, or legislative records; a data-center campus may accumulate a history of related political and infrastructural events.</p>
  - title: Verification
    body: <p>Verification is treated as a property of a record rather than an assumption that all mapped information carries equal certainty. Project existence, status, operator identity, capacity, and location may therefore carry different evidentiary confidence.</p>
  - title: Geography
    body: <p>Records may be represented at different spatial scales. Point locations identify specific facilities where coordinates are available. Events and legislation may instead be assigned to countries, states or provinces, counties, municipalities, or other administrative units.</p>
  - title: Coverage and limitations
    body: <p>The Atlas is a research dataset under continuing construction. Geographic coverage, historical depth, project verification, and policy coverage differ across jurisdictions. Absence from the Atlas should not automatically be interpreted as absence in the world.</p>
- type: steps
  heading: Manual
  intro: The Atlas separates analytical filtering from spatial context. Browse determines which records are included in the current view; map-level controls change how those records and their surroundings are displayed.
  items:
  - title: Choose a layer
    body: <p>Switch between Data Centers, Events, and Legislation. Each layer changes both the map and the Browse interface.</p>
  - title: Filter records
    body: <p>Use year, type, status, category, verification, or operator controls in Browse to define the analytical record set.</p>
  - title: Browse
    body: <p>Move between national, subnational, operator, and record views where available. These views reorganize the same filtered set.</p>
  - title: Read the map key
    body: <p>Toggleable items change map visibility. Informational items explain symbology without changing the record set.</p>
  - title: Select geography
    body: <p>Click analytical geography to create a persistent territorial scope. Hover is temporary; a selected geography remains active across related interactions.</p>
  - title: Inspect details
    body: <p>The Details window exposes record attributes, sources, and related data centers, events, legislation, actors, and geography.</p>
  - title: Use contextual layers
    body: <p>Data centers, fiber and landing points, labels, and contextual boundaries can be shown or hidden without changing the analytical filters.</p>
  - title: Copy or export
    body: <p>Where available, copy or export functions can move structured information into a research workflow while retaining source references.</p>
- type: updates
  heading: News & Planned Updates
  items:
  - date: 05 August 2026
    title: Integrated map key
    body: <p>Map-level visibility controls were consolidated into a lighter contextual key while Browse retained analytical filtering.</p>
  - date: 05 August 2026
    title: Fiber-optic context
    body: <p>Submarine cable routes and landing points were added as a combined contextual infrastructure layer.</p>
  - date: Planned
    title: Future work
    body: <p>Expanded global data-center verification, additional infrastructure context, dataset downloads and citation guidance, and research essays or case studies.</p>
---
