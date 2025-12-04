# Container Weight Tracking - Quick Start Guide

## What Changed?

**OLD WAY (3 steps):**
1. Select item/lot
2. Empty container, clean, weigh empty ❌
3. Fill container, weigh full

**NEW WAY (2 steps):**
1. Select item/lot
2. Weigh bottle with ingredient, enter label amount ✅

## Quick Setup (One-Time)

### 1. Run Database Migration
```bash
# Development
supabase db reset

# Production
supabase db push
```

### 2. That's it! Start using the new workflow.

## Daily Usage

### Creating a Container

**Example: You receive a 5kg jug of glycerin from supplier**

1. Go to **Inventory → Containers → Add Container**

2. **Step 1** - Select Item:
   - Item: Glycerin
   - Lot: LOT-2025-001
   - Location: Warehouse
   - Status: Backstock

3. **Step 2** - Enter Weights:
   - Put jug on scale: **5.2 kg** ← Enter this as "Gross Weight"
   - Check label: **5.0 kg** ← Enter this as "Intended Net Weight"
   - System calculates: Container = **0.2 kg** (auto-calculated!)
   - Optional: Scan supplier barcode if available

4. Click **"Create Container & Print Label"**
   - System creates container CNT-2025-001
   - QR code label prints automatically
   - Stick label on jug

**Done! No need to empty or transfer anything.**

### Doing Inventory

**Example: Count remaining glycerin in that jug**

1. Find container in **Inventory → Containers**
2. Click on CNT-2025-001
3. Put jug on scale: **3.7 kg**
4. Enter **3.7** in "New Gross Weight"
5. System shows: Net Weight = **3.5 kg** (using 0.2 kg tare)
6. Click **"Save Measurement"**

**Done! Your inventory is updated with timestamp and your name.**

### Using Barcode Scanner

**Fast inventory with scanner:**

1. Scan container QR code (on label)
2. Weigh container
3. Enter weight
4. Save

System knows which container, calculates net weight automatically!

## Real-World Example

### Morning Inventory Scenario

You need to count 20 bottles of essential oils:

**Without transfers (NEW WAY):**
1. Scan bottle QR code (2 seconds)
2. Put on scale, read weight (3 seconds)
3. Enter weight, click save (2 seconds)
4. **Total: 7 seconds per bottle = 140 seconds (2.3 minutes) for all 20**

**With transfers (OLD WAY):**
1. Empty bottle into temp container (30 seconds)
2. Clean and dry bottle (60 seconds)
3. Weigh empty bottle (5 seconds)
4. Pour ingredient back (30 seconds)
5. Weigh full bottle (5 seconds)
6. **Total: 130 seconds per bottle = 2,600 seconds (43 minutes) for all 20**

**Time saved: 40+ minutes per 20 bottles!**

## Understanding the Weight Model

### Terminology
- **Gross Weight** = Total weight (bottle + ingredient together)
- **Intended Net Weight** = What supplier says is inside (from label)
- **Container Weight (Tare)** = Empty bottle weight (auto-calculated)
- **Net Weight** = Ingredient weight (gross - tare)

### Example Workflow

**Initial Setup:**
- Gross: 500g (bottle + ingredient)
- Intended Net: 400g (label says 400g inside)
- **Calculated Tare: 100g** ← System calculates this

**After Using Some:**
- Gross: 350g (weigh bottle with remaining ingredient)
- Tare: 100g (system remembers)
- **Net: 250g** ← System calculates this (350 - 100)

**You used:** 400g - 250g = **150g of ingredient**

## Barcode Features

### Supplier Barcodes
When creating container, scan or enter supplier's barcode:
- Links supplier bottle to your container
- Track which supplier bottle is which container
- Scan supplier barcode later to find container

### Container QR Codes
Every container gets a QR code label:
- Contains container ID, code, item, lot
- Scan during inventory for instant identification
- Print anytime from container detail page

### Scan Logging
Every scan is logged with:
- Who scanned it
- When it was scanned
- What was scanned (supplier barcode or container QR)
- Result (success/failure)

## Tips & Tricks

### Tip 1: Use Supplier Bottles
Don't transfer ingredients! Use the bottle it came in.
- Saves time
- Prevents waste
- Reduces contamination risk

### Tip 2: Print Labels Immediately
Print QR label right after creating container.
- Stick label on bottle while you have it
- Makes future inventory much faster

### Tip 3: Scan During Receiving
When receiving new ingredients:
1. Scan supplier barcode
2. Create container with that barcode linked
3. Put on scale for gross weight
4. Enter label amount for intended net
5. Print and apply QR label

### Tip 4: Check Tare Weight
If net weight calculation seems wrong:
- Check if you're using the right container
- Verify gross weight entry
- Container might have different tare than calculated

### Tip 5: Refine Tare Over Time
When a bottle is completely empty:
1. Weigh empty bottle
2. Use "Refine Tare Weight" feature (future enhancement)
3. System updates tare for more accuracy

## Common Questions

**Q: What if I don't know the intended net weight?**
A: Check the supplier's label/certificate of analysis. It should state the net weight. If not available, weigh an empty identical bottle and calculate intended net = gross - empty bottle weight.

**Q: Can I still transfer ingredients to different containers?**
A: Yes! The system supports that too. Just:
1. Create new container
2. Transfer ingredient
3. Weigh and enter weights
4. Mark old container as "empty"

**Q: What if the bottle weight changes (different supplier bottles)?**
A: Each container tracks its own tare weight. Different bottles = different containers with different tare weights. System handles this automatically.

**Q: How accurate is the auto-calculated tare?**
A: Very accurate! It's based on actual weight measurements. As you use the container, you can refine the tare weight over time for even more accuracy.

**Q: Can I edit the tare weight manually?**
A: Currently, tare is auto-calculated. If you need to adjust it, contact your system administrator. Future update will add "Refine Tare Weight" feature.

**Q: What happens when I scan a supplier barcode?**
A: System searches for containers linked to that barcode. If found, opens that container. If not found, you can create a new container with that barcode linked.

## Workflow Comparison

| Task | Old Way | New Way | Time Saved |
|------|---------|---------|------------|
| Create container | Empty, clean, weigh, fill, weigh (5-10 min) | Weigh full, enter label amount (30 sec) | **9+ minutes** |
| Inventory count | Find container, weigh, calculate (1-2 min) | Scan, weigh, save (10 sec) | **1.5+ minutes** |
| Daily inventory (50 items) | ~100 minutes | ~10 minutes | **90 minutes** |

## Need Help?

1. **Read full documentation:** `CONTAINER_WEIGHT_REDESIGN_SUMMARY.md`
2. **Check barcode docs:** `BARCODE_SYSTEM_OVERVIEW.md`
3. **Review database schema:** `supabase/migrations/20250111_inventory_containers_system.sql`

---

**Remember:** The goal is to track inventory accurately with minimal effort. The new system eliminates unnecessary steps while maintaining full traceability and employee accountability.
