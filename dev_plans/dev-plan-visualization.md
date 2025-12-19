# Faux Feelings Visualization Feature - Dev Plan

## Overview

Add a visualization tab to the Faux Feelings app that displays a **responsive Sankey diagram** showing the flow from selected faux-feelings → feelings → needs. The diagram adapts to viewport size: **vertical (top-to-bottom) on mobile** and **horizontal (left-to-right) on desktop**. The implementation prioritizes mobile-first design.

---

## Phase 1: Tab Infrastructure

### 1.1 Update HTML Structure

**File:** `index.html`

- Add a tab navigation component inside the header (after the subtitle)
- Create two tab content containers:
  - `#tab-search` - wraps all existing `<main>` content
  - `#tab-visualization` - new container for the Sankey diagram

**Acceptance Criteria:**
- [ ] Tab navigation is visible below the header subtitle
- [ ] Both tab containers exist in the DOM
- [ ] Only one tab content is visible at a time
- [ ] HTML passes validation

### 1.2 Add Tab Styles

**File:** `styles.css`

- Style the tab navigation (pill-style toggle or underlined tabs)
- Add `.tab-content` base styles with `display: none`
- Add `.tab-content.active` to show the active tab
- Style the selection indicator/badge
- Ensure tab navigation is touch-friendly (min 44px tap targets)

**Acceptance Criteria:**
- [ ] Tabs are visually clear and match existing design language
- [ ] Active tab state is obvious
- [ ] Selection badge is subtle but noticeable
- [ ] Works well on mobile (test at 375px width)

### 1.3 Implement Tab Switching Logic

**File:** `app.js`

- Add DOM references for tab buttons and tab content containers
- Create `switchTab(tabName)` function
- Add click event listeners to tab buttons
- Update selection indicator when `selectedFauxFeelings` changes

**Acceptance Criteria:**
- [ ] Clicking tabs switches visible content
- [ ] Active tab button state updates
- [ ] Selection indicator shows correct count
- [ ] Tab state doesn't affect search/selection functionality

---

## Phase 2: Sankey Diagram - Basic Implementation

### 2.1 Add D3.js Dependencies

**File:** `index.html`

- Add D3.js v7 via CDN: `https://cdn.jsdelivr.net/npm/d3@7`
- Add D3-sankey plugin via CDN: `https://cdn.jsdelivr.net/npm/d3-sankey@0.12.3`

**Acceptance Criteria:**
- [ ] D3 and d3-sankey load without errors
- [ ] Can access `d3` and `d3.sankey` in console

### 2.2 Create Visualization Container

**File:** `index.html`

- Add SVG container inside `#tab-visualization`
- Include empty state message for when nothing is selected

**File:** `styles.css`

- Style the visualization container to be full-height
- Add responsive SVG styles (`width: 100%`, `height: auto` or viewport-based)
- Style the empty state message
- Ensure container supports both orientations:
  - Mobile: Vertical layout (height > width)
  - Desktop: Horizontal layout (width > height)

**Acceptance Criteria:**
- [ ] SVG container fills available space
- [ ] Empty state shows helpful message
- [ ] Container is responsive
- [ ] Container adapts dimensions based on viewport size

### 2.3 Build Sankey Data Transformer

**File:** `app.js`

Create function `buildSankeyData()` that:
- Reads from `selectedFauxFeelings` Set
- Builds nodes array: all unique faux-feelings, feelings, and needs
- Builds links array: connections with appropriate weights
- Returns `{ nodes, links }` in d3-sankey format

**Data Structure:**
```javascript
{
  nodes: [
    { id: "faux-Abandoned", name: "Abandoned", type: "faux" },
    { id: "feeling-Sad", name: "Sad", type: "feeling" },
    { id: "need-Connection", name: "Connection", type: "need" },
    // ...
  ],
  links: [
    { source: "faux-Abandoned", target: "feeling-Sad", value: 1 },
    { source: "feeling-Sad", target: "need-Connection", value: 1 },
    // ...
  ]
}
```

**Acceptance Criteria:**
- [ ] Returns empty structure when nothing selected
- [ ] Correctly deduplicates feelings/needs across multiple faux-feelings
- [ ] Link values aggregate correctly (feeling linked by 3 faux-feelings = value 3)
- [ ] Console.log output matches expected structure

### 2.4 Implement Basic Sankey Renderer

**File:** `app.js`

Create function `renderSankey()` that:
- Calls `buildSankeyData()`
- Clears existing SVG content
- If no data, shows empty state
- Detects viewport size to determine orientation
- Configures d3-sankey layout based on orientation
- Renders nodes as rectangles
- Renders links as paths
- Adds text labels to nodes

**Sankey Configuration (Adaptive Layout):**
```javascript
// Detect viewport and choose orientation
const isMobile = window.innerWidth < 768;

// Configure sankey with standard horizontal layout
const sankey = d3.sankey()
  .nodeId(d => d.id)
  .nodeWidth(20)
  .nodePadding(10)
  .nodeAlign(d3.sankeyCenter)
  .extent([[margin, margin], [width - margin, height - margin]]);

// Apply to data
const graph = sankey(data);

// For mobile: swap x/y coordinates to create vertical flow
// For desktop: use standard horizontal layout
if (isMobile) {
  // Swap x/y coordinates:
  // - node.y0/y1 becomes the x position (horizontal position)
  // - node.x0/x1 becomes the y position (vertical position)
  // This creates top-to-bottom flow instead of left-to-right
}
```

**Acceptance Criteria:**
- [ ] Diagram renders when switching to visualization tab
- [ ] Mobile (< 768px): Three rows visible (top to bottom)
- [ ] Desktop (≥ 768px): Three columns visible (left to right)
- [ ] Links connect appropriate nodes in the correct direction
- [ ] Labels are readable on both orientations
- [ ] No console errors

### 2.5 Add Color Coding

**File:** `app.js` or inline styles

- Faux-feelings: Use existing app color (e.g., `#7ba8c1`)
- Feelings: A complementary mid-tone (e.g., `#9cb5a4` - sage green)
- Needs: Another complementary tone (e.g., `#c4a882` - warm tan)
- Links: Gradient or source-colored with low opacity

**Acceptance Criteria:**
- [ ] Each node type has distinct color
- [ ] Colors harmonize with existing app palette
- [ ] Links are visible but don't overwhelm

---

## Phase 3: Interactivity & Polish

### 3.1 Add Hover/Tap Highlighting

**File:** `app.js`

- On node hover/tap: highlight that node and all connected links/nodes
- Dim non-connected elements (reduce opacity)
- On mouseout/tap-away: restore full visibility

**Implementation Notes:**
- Track connections in a lookup map for performance
- Use CSS classes for highlight states (`.dimmed`, `.highlighted`)
- Consider touch events: `touchstart` for mobile

**Acceptance Criteria:**
- [ ] Hovering a node highlights its path
- [ ] Non-connected elements dim
- [ ] Works with touch on mobile
- [ ] Transitions are smooth (use CSS transitions)

### 3.2 Add Tooltips

**File:** `app.js`, `styles.css`

- On hover/tap, show tooltip with node name and connection count
- Position tooltip near cursor/finger
- Ensure tooltip doesn't overflow viewport

**Acceptance Criteria:**
- [ ] Tooltip appears on interaction
- [ ] Shows useful information
- [ ] Doesn't go off-screen
- [ ] Dismisses appropriately

### 3.3 Animated Transitions

**File:** `app.js`

- When data changes, animate nodes/links into new positions
- New nodes fade in
- Removed nodes fade out
- Use D3 transitions

**Acceptance Criteria:**
- [ ] Adding a faux-feeling animates new elements in
- [ ] Removing a faux-feeling animates elements out
- [ ] Transitions are smooth (300-500ms)
- [ ] No jarring jumps

### 3.4 Responsive Refinements

**File:** `styles.css`, `app.js`

- Recalculate SVG dimensions on window resize
- Detect orientation/viewport size and choose appropriate layout:
  - **Mobile/Portrait (< 768px):** Vertical Sankey (top-to-bottom flow)
  - **Desktop/Landscape (≥ 768px):** Horizontal Sankey (left-to-right flow)
- Adjust font sizes for small screens
- Consider vertical scroll on mobile for complex diagrams (many selections)
- Consider horizontal scroll on desktop for complex diagrams
- Test at 320px, 375px, 768px, 1024px widths

**Acceptance Criteria:**
- [ ] Diagram redraws on resize with appropriate orientation
- [ ] Mobile shows vertical flow (top-to-bottom)
- [ ] Desktop shows horizontal flow (left-to-right)
- [ ] Readable at all breakpoints
- [ ] No unwanted overflow (vertical on mobile, horizontal on desktop)
- [ ] Touch interactions work well on mobile
- [ ] Mouse interactions work well on desktop

---

## Phase 4: Edge Cases & Final Polish

### 4.1 Handle Edge Cases

- **No selection:** Show friendly empty state with instructions
- **Single faux-feeling:** Diagram still renders correctly
- **Many selections (10+):** Diagram remains usable, consider scrolling
- **Long label names:** Truncate with ellipsis or wrap

**Acceptance Criteria:**
- [ ] All edge cases handled gracefully
- [ ] No crashes or visual bugs
- [ ] User always knows what to do

### 4.2 Accessibility

- Add ARIA labels to tab buttons
- Ensure tab switching works with keyboard
- Add `role="img"` and `aria-label` to SVG
- Consider screen reader description of connections

**Acceptance Criteria:**
- [ ] Tabs navigable via keyboard
- [ ] Screen reader announces tab changes
- [ ] SVG has descriptive label

### 4.3 Performance Check

- Profile with 10+ faux-feelings selected
- Ensure no lag on tab switch
- Debounce resize handler
- Check memory usage (no leaking event listeners)

**Acceptance Criteria:**
- [ ] Tab switch feels instant
- [ ] No jank during interactions
- [ ] Works smoothly on mid-range phones

---

## File Change Summary

| File | Changes |
|------|---------|
| `index.html` | Add tab navigation, visualization container, D3 script tags |
| `styles.css` | Tab styles, visualization container, Sankey node/link styles, responsive adjustments |
| `app.js` | Tab switching logic, `buildSankeyData()`, `renderSankey()`, interaction handlers |

---

## Testing Checklist

### Functional Tests
- [ ] Can switch between tabs
- [ ] Selecting faux-feelings updates visualization
- [ ] Deselecting faux-feelings updates visualization  
- [ ] Highlight interaction works on desktop
- [ ] Highlight interaction works on mobile
- [ ] Empty state displays correctly

### Visual Tests
- [ ] Matches existing app aesthetic
- [ ] Responsive at all breakpoints
- [ ] Vertical (top-to-bottom) flow is clear and intuitive on mobile
- [ ] Horizontal (left-to-right) flow is clear and intuitive on desktop
- [ ] Orientation switches smoothly when resizing viewport
- [ ] Colors are accessible (sufficient contrast)
- [ ] Animations are smooth

### Device Tests
- [ ] iPhone SE (375px)
- [ ] iPhone 14 (390px)
- [ ] Android mid-range (360px)
- [ ] iPad (768px)
- [ ] Desktop (1024px+)

---

## Optional Enhancements (Future)

- **Export:** Save visualization as image
- **Share:** Generate shareable link with selections encoded
- **Legend:** Add a legend explaining the three columns
- **Statistics:** Show "most common need" or other insights
- **Alternative views:** Toggle between Sankey and simple list view
