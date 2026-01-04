# L2LP Evidence Tracker - Design Guidelines

## Design Approach

**Design System**: Material Design principles with educational app refinement  
**Rationale**: Utility-focused productivity tool requiring efficiency, clear information hierarchy, and mobile-first optimization for teachers working on phones and Chromebooks.

**Core Principles**:
- Speed over aesthetics: Every interaction optimized for quick evidence capture
- Mobile-command-center: Design for one-handed phone use first
- Scan-friendly data: Tables and lists designed for rapid visual scanning
- Progressive disclosure: Complex features available but not intrusive

---

## Typography

**Font Stack**: Inter (Google Fonts)
- Headings: 600 weight, sizes: text-2xl (page titles), text-lg (section headers)
- Body: 400 weight, text-base for content, text-sm for metadata
- Data tables: 400 weight, text-sm for optimal density
- Form labels: 500 weight, text-sm
- Buttons: 500 weight, text-sm

---

## Layout System

**Spacing Units**: Tailwind units of 2, 4, 6, and 8
- Component padding: p-4
- Section spacing: space-y-6 (mobile), space-y-8 (desktop)
- Card/container gaps: gap-4
- Form field spacing: space-y-4
- Page margins: px-4 (mobile), px-6 (tablet), max-w-7xl mx-auto (desktop)

**Grid Strategy**:
- Student cards: grid-cols-1 md:grid-cols-2 lg:grid-cols-3
- Evidence timeline: Single column with compact cards
- Outcome coverage table: Responsive table with horizontal scroll on mobile
- Dashboard stats: grid-cols-2 gap-4 on mobile, grid-cols-4 on desktop

---

## Component Library

### Navigation
- **Mobile**: Bottom tab bar (Students, Upload, Library, Outcomes) with icons from Heroicons
- **Desktop**: Left sidebar with icon + label navigation, collapsible
- **Header**: Fixed top bar with page title, student selector dropdown (when relevant), user menu

### Cards
- Evidence cards: Thumbnail (if photo/video) + metadata grid + outcome chips + tap to expand
- Student cards: Avatar placeholder + name + class + quick stats (evidence count)
- Outcome cards: Code badge + strand label + description + evidence count indicator

### Forms
- Upload flow: Multi-step wizard with progress indicator (Student → File → Outcomes → Tags → Review)
- Form inputs: Floating labels, clear focus states, helper text below fields
- File upload: Large dropzone with camera icon, "Take photo" and "Choose file" buttons
- Multi-select outcomes: Searchable checklist with selected items showing as dismissible chips above

### Data Display
- **Coverage table**: Sticky header, alternating row backgrounds, color-coded evidence count (0=red accent, 1-2=amber, 3+=green)
- **Evidence timeline**: Chronological feed with date dividers, compact card format
- **Filter bar**: Horizontal scrolling chips (mobile), multi-column layout (desktop)

### Buttons & Actions
- Primary CTA: Full-width on mobile (Upload Evidence), standard width on desktop
- Secondary actions: Outlined style, ghost style for tertiary
- Floating Action Button: Bottom-right for quick "Upload Evidence" on student dashboard
- Icon buttons: Consistent 40px × 40px touch target

### Overlays
- Evidence detail modal: Full-screen on mobile, centered modal on desktop with file preview
- Student selector: Bottom sheet (mobile), dropdown menu (desktop)
- Filters: Slide-in drawer (mobile), inline filter panel (desktop)

---

## Page-Specific Layouts

### Students List
- Search bar at top, grid of student cards below, FAB for "Add Student"

### Student Dashboard  
- Hero section: Student name + class + quick stats row
- Three sections stacked: Recent Evidence (timeline), Coverage Table, Missing Outcomes (alert-style cards)

### Upload Evidence
- Wizard stepper at top, current step content fills viewport, "Back" and "Next/Submit" buttons fixed at bottom

### Evidence Library
- Filter drawer/panel at top, results grid below (masonry layout for mixed media types)

### Learning Outcomes
- Search + strand filter at top, scrollable list with expandable outcome cards showing description + linked evidence

---

## Images

**No hero images needed** - This is a productivity tool, not a marketing site. Focus purely on functional UI with data and forms.

**Evidence thumbnails**: Square aspect ratio (1:1), max 120px on mobile, 160px on desktop  
**File type icons**: Use Heroicons document types for non-image evidence

---

## Accessibility

- Minimum 44px touch targets for all interactive elements
- ARIA labels on icon-only buttons
- Form validation with inline error messages (text-sm, red accent color)
- Keyboard navigation support for all workflows
- High contrast ratios maintained throughout