# DayZ Player Health Tracker - Design Guidelines

## Design Approach
**Reference-Based: Apple Health App** combined with **shadcn UI** component library as explicitly requested. The design prioritizes clean data visualization, card-based layouts, and intuitive health metric tracking.

## Core Design Principles
1. **Data Clarity First**: Health metrics must be immediately readable and understandable
2. **Gesture-Free Simplicity**: Desktop-optimized interactions (no swipe gestures)
3. **Metric Hierarchy**: Critical stats (health, blood) prominently displayed over secondary data
4. **Temporal Context**: Always show when data was last updated

## Typography
- **Primary Font**: Inter (Google Fonts) - clean, highly legible for data
- **Headings**: 
  - H1: text-3xl font-bold (Player names, main titles)
  - H2: text-2xl font-semibold (Section headers)
  - H3: text-lg font-medium (Card titles, metric labels)
- **Body**: text-sm to text-base (metric descriptions, timestamps)
- **Data Display**: font-mono for numerical values (health points, coordinates)

## Layout System
**Spacing**: Use Tailwind units of **2, 4, 8, 12, 16** (p-2, p-4, p-8, p-12, p-16)
- Page padding: p-8 on desktop, p-4 on mobile
- Card padding: p-6
- Section gaps: gap-8 between major sections, gap-4 within cards
- Grid gaps: gap-6 for metric cards

**Container Structure**:
- Max-width: max-w-7xl for main content
- Sidebar width: w-64 (player list)
- Two-column layout: Sidebar (player list) + Main content area

## Component Library

### Navigation & Structure
**Sidebar Player List**:
- Fixed left sidebar (w-64)
- Search bar at top (sticky)
- Player cards: Compact with avatar circle, name, Steam ID, online status indicator
- Active player: Highlighted with subtle background

**Top Bar**:
- Webhook URL display with copy button
- Last update timestamp
- Server status indicator

### Data Display Components

**Hero Health Summary Cards** (Top of player page):
- 2x2 grid on desktop (grid-cols-2)
- Large metric value with icon
- Cards: Health, Blood, Energy, Water
- Each card: Icon + Value + Unit + small trend indicator

**Metric Detail Cards**:
- Full-width cards for secondary metrics
- Include: Shock, Temperature, Stamina, Wetness
- Horizontal layout: Icon | Label | Value | Bar visualization

**Statistics Cards**:
- 3-column grid (grid-cols-3)
- Playtime, Distance Walked, Killed Zombies
- Icon + Large number + descriptive label

**Chart Containers**:
- Full-width cards with chart title and time range selector
- Responsive height (h-64 to h-80)
- Charts for: Health over time, Blood levels, Energy/Water combined, Movement distance

**Map/Position Card**:
- Display coordinates in monospace font
- Visual coordinate grid if possible
- Last known position timestamp

**Disease Status**:
- Alert-style cards when diseases present
- List format with disease name and severity indicator
- Empty state: "Healthy - No active diseases"

### Interactive Elements
**Buttons**:
- Primary: Webhook copy, Time range selectors
- Use shadcn Button component variants
- Icon + Text combinations for actions

**Search/Filter**:
- Search input at top of player list
- Filter by online status
- Real-time filtering (no submit button)

### Status Indicators
- **Online Status**: Green dot + "Active" | Gray dot + "Last seen X mins ago"
- **Health Level**: Red (<50), Yellow (50-75), Green (>75)
- **Critical Alerts**: Red badge for bleeding, shock, or critical stats

## Data Visualization
**Chart Style**:
- Line charts for time-series data (health, blood, energy over time)
- Smooth curves (not jagged lines)
- Grid lines: Subtle, horizontal only
- Axis labels: Clear timestamps and values
- Tooltips on hover: Show exact value + timestamp

**Color Coding** (Note: Specific colors chosen later):
- Health metrics: Warm tones
- Hydration/Energy: Cool tones  
- Critical states: Alert tones
- Neutral stats: Grayscale

## Page Structure

### Player List View (Sidebar)
- Sticky search bar
- Scrollable list of player cards
- Sort by: Last active, Name, Playtime

### Player Detail View (Main Content)
1. **Header Section**: Player name, Steam ID, last update time
2. **Critical Metrics Grid**: 2x2 cards (Health, Blood, Energy, Water)
3. **Secondary Metrics**: Horizontal cards for temperature, stamina, etc.
4. **Statistics Row**: 3-column grid (playtime, distance, kills)
5. **Charts Section**: 
   - Health/Blood trend chart (prominent, full-width)
   - Energy/Water combined chart
   - Distance over time chart
6. **Position & Status**: Coordinates + Disease list
7. **Raw Data Accordion**: Collapsible JSON viewer for developers

### Dashboard/Overview (Optional home page)
- Server statistics (total players, active players)
- Recent activity feed
- Top statistics (most active player, longest session, etc.)

## Responsive Behavior
**Desktop (lg:)**: Sidebar + main content side-by-side
**Tablet (md:)**: Collapsible sidebar, 2-column metric grids
**Mobile**: 
- Hidden sidebar (hamburger menu)
- Single column layouts
- Stacked metric cards
- Simplified charts (reduce data points)

## Special Considerations
- **Real-time Updates**: Visual pulse/animation when new data arrives
- **Empty States**: Friendly messages for new players with no history
- **Loading States**: Skeleton screens for charts while data loads
- **Error States**: Clear messaging if webhook fails or data is missing

## Animations
**Minimal and Purposeful**:
- Smooth transitions on metric value changes (number counting animation)
- Fade-in for new player data entries
- Subtle pulse on "online" status indicator
- Chart line drawing animation on initial load (quick, 0.5s)

---

This design creates a professional, data-dense health tracking interface that mirrors the clarity of Apple Health while being optimized for desktop monitoring of DayZ player statistics.