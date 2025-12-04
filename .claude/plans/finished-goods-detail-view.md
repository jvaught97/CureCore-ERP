# Implementation Plan: Finished Goods Detail View

## Overview
Create a comprehensive detail modal for finished goods that displays all available product information when a user clicks on a finished good item in the table.

## Implementation Approach

### 1. Component Structure
Create `FinishedGoodDetailModal.tsx` following existing modal patterns (IngredientDetailModal, PackagingDetailModal).

**Component Location**: `app/(operations)/finished-goods/_components/FinishedGoodDetailModal.tsx`

**Props Interface**:
```typescript
interface FinishedGoodDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  finishedGoodId: string;
  onUpdate?: () => void; // Callback to refresh parent data
}
```

### 2. Data Fetching Strategy

**Main Query**: Join finished_goods with related tables
```sql
SELECT
  fg.*,
  f.name as formula_name,
  f.version as formula_version,
  f.status as formula_status,
  f.notes as formula_notes,
  f.target_pack_size,
  f.target_yield_percentage,
  b.manufacturing_status,
  b.completed_at as batch_completed_at,
  b.actual_yield,
  b.total_cost as batch_total_cost
FROM finished_goods fg
LEFT JOIN formulas f ON fg.product_id = f.id
LEFT JOIN batches b ON fg.batch_id = b.id
WHERE fg.id = ?
```

**Additional Queries**:
- Formula ingredients (for recipe composition)
- Formula packaging (for packaging requirements)
- Order fulfillment details (for usage history)

### 3. Tab Structure

#### Tab 1: Overview
**Content**:
- Header with product name, SKU, status badge
- Key metrics cards:
  - Quantity Available
  - Quantity Allocated
  - Total Value (production_cost × quantity_available)
  - Days Until Expiry (if applicable)
- Product details grid:
  - Batch Code
  - Lot Number
  - Location
  - Unit
  - Production Cost per Unit
- Dates section:
  - Manufactured Date
  - Expiry Date (with warning if < 30 days)
  - Created Date
- Notes section (editable)

#### Tab 2: Recipe & Packaging
**Content**:
- Formula information:
  - Formula name and version
  - Target pack size and yield
  - Formula status
- Recipe composition table:
  - Ingredient name
  - Quantity
  - Unit
  - Percentage of formula
- Packaging requirements table:
  - Packaging item name
  - Quantity needed
  - Unit

#### Tab 3: Batch Details
**Content**:
- Batch information card:
  - Batch code (clickable link to batch page)
  - Manufacturing status
  - Completed date
  - Actual yield vs target
  - Total batch cost
- Manufacturing timeline (if available)
- Quality checks/COA links (if available)

#### Tab 4: Allocation & Orders
**Content**:
- Allocation summary:
  - Total allocated quantity
  - Available for allocation
  - Allocation percentage bar
- Orders table:
  - Sales order number
  - Line item details
  - Quantity used
  - Fulfilled date
  - Fulfilled by (user)
  - Total COGS breakdown

#### Tab 5: Stock History
**Content**:
- Movement history table:
  - Date/time
  - Transaction type (created, allocated, shipped, adjusted)
  - Quantity change
  - New balance
  - Reference (order number, batch code, etc.)
  - Notes
  - User who made change

### 4. Quick Actions

**Action Bar** (top of modal):
- Change Status dropdown (Available → Allocated → Shipped → Quarantine)
- Adjust Quantity button (opens quantity adjustment dialog)
- View Batch button (navigates to batch page)
- View Product button (navigates to formula/product page)
- Edit Details button (enables inline editing mode)

### 5. Visual Elements

**Status Indicators**:
- Color-coded status badge (green=available, blue=allocated, gray=shipped, red=quarantine)
- Expiry warning banner (red if < 7 days, yellow if < 30 days)
- Low stock indicator (if quantity_available < threshold)

**Layout**:
- Full-screen modal with close button
- Left sidebar with tabs (vertical stacked)
- Main content area on right
- Sticky header with product name and key actions
- Premium design with rounded-2xl cards, gradients, shadow effects

### 6. Integration Points

**Finished Goods Page Changes**:
```typescript
// Add state for selected item
const [selectedFinishedGood, setSelectedFinishedGood] = useState<string | null>(null);
const [detailModalOpen, setDetailModalOpen] = useState(false);

// Update table row click handler
<tr
  onClick={() => {
    setSelectedFinishedGood(good.id);
    setDetailModalOpen(true);
  }}
  className="cursor-pointer hover:bg-accent/50"
>

// Add modal component
{detailModalOpen && selectedFinishedGood && (
  <FinishedGoodDetailModal
    isOpen={detailModalOpen}
    onClose={() => {
      setDetailModalOpen(false);
      setSelectedFinishedGood(null);
    }}
    finishedGoodId={selectedFinishedGood}
    onUpdate={() => fetchData()}
  />
)}
```

### 7. Edit Capabilities

**Editable Fields**:
- Location
- Status
- Notes
- Quantity adjustments (with reason tracking)

**Edit Mode**:
- Toggle edit mode with "Edit Details" button
- Inline editing with Save/Cancel buttons
- Validation for required fields
- Optimistic updates with rollback on error

### 8. Error Handling

- Loading states for each tab
- Error messages if data fetch fails
- Empty states for tabs with no data
- Validation errors for edits

### 9. Performance Considerations

- Lazy load tab content (only fetch when tab is clicked)
- Cache fetched data for modal session
- Debounce search/filter inputs
- Pagination for large order history

### 10. Accessibility

- Keyboard navigation (Tab, Escape to close)
- ARIA labels for all interactive elements
- Focus management (trap focus in modal, return to trigger on close)
- Screen reader announcements for status changes

## Implementation Steps

1. Create `FinishedGoodDetailModal.tsx` component file
2. Implement data fetching functions with Supabase queries
3. Build tab structure with navigation
4. Implement Overview tab with key metrics
5. Implement Recipe & Packaging tab
6. Implement Batch Details tab
7. Implement Allocation & Orders tab
8. Implement Stock History tab
9. Add quick actions functionality
10. Integrate modal into finished-goods page
11. Add edit mode and save functionality
12. Test all interactions and data flows
13. Add loading and error states
14. Polish styling and animations

## Files to Create/Modify

### New Files:
- `app/(operations)/finished-goods/_components/FinishedGoodDetailModal.tsx`

### Modified Files:
- `app/(operations)/finished-goods/page.tsx` (add modal integration)

## Database Queries Needed

1. Main finished good with joins to formulas and batches
2. Formula ingredients list
3. Formula packaging list
4. Order fulfillment details (allocation history)
5. Stock movement history (if inventory_history tracks finished goods)

## Design Consistency

- Follow existing modal patterns from IngredientDetailModal
- Use theme utilities for colors
- Use Lucide icons for visual elements
- Apply premium design with AnimatedBackground
- Maintain consistent spacing and typography
