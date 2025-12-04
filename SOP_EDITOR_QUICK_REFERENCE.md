# SOP Editor - Quick Reference Guide

## New Toolbar Buttons (GMP/QMS Features)

### 1. Sub-Bullet Button (→)
**What it does**: Converts numbered steps into nested bullet points

**When to use**: You have numbered items that should be details under a previous step

**Example**:
```
You have:
1. Verify ingredients
2. Supplier name
3. Supplier lot
4. COA number

Select items 2-4, click Sub-Bullet →

You get:
1. Verify ingredients
   • Supplier name
   • Supplier lot
   • COA number
```

---

### 2. Promote to Step Button (↑)
**What it does**: Converts nested bullets back into numbered steps

**When to use**: You have bullet points that should be their own numbered steps

**Example**:
```
You have:
1. Verify ingredients
   • Supplier name
   • Supplier lot
2. Inspect packaging

Select "Supplier name", click Promote →

You get:
1. Verify ingredients
2. Supplier name
3. Supplier lot
4. Inspect packaging
```

---

### 3. Sub-Step Button (⋮)
**What it does**: Creates nested numbered lists (2.1, 2.2, etc.)

**When to use**: A step has multiple sub-procedures that need their own numbers

**Example**:
```
You have:
1. Clean equipment
2. Verify calibration
3. Assemble components

Cursor on line 2, click Sub-Step →

You get:
1. Clean equipment
2. Verify calibration
   2.1 [New sub-step]
3. Assemble components
```

---

## Keyboard Shortcuts

| Key | Action | When |
|-----|--------|------|
| **Tab** | Indent list item | In any list |
| **Shift+Tab** | Outdent list item | In any list |
| **Enter** (on empty bullet) | Exit bullets, create numbered step | In bullet list |
| **Ctrl+B** | Bold | Anywhere |
| **Ctrl+I** | Italic | Anywhere |
| **Ctrl+U** | Underline | Anywhere |

---

## Common Workflows

### Creating a Typical SOP Procedure

**Step 1**: Type main steps as numbered list
```
1. Retrieve raw materials
2. Verify ingredients
3. Inspect packaging
4. Record verification
```

**Step 2**: Add details under step 2
- Type additional numbered items after step 2
- Select those items
- Click **Sub-Bullet (→)**

```
1. Retrieve raw materials
2. Verify ingredients
   • Supplier name
   • Supplier lot number
   • COA on file
3. Inspect packaging
4. Record verification
```

**Step 3**: Finish bullets and continue steps
- Press **Enter** twice after last bullet
- Editor automatically creates step 3

---

### Creating Sub-Steps (Nested Numbers)

**Step 1**: Position cursor at end of a step
```
1. Clean equipment
2. Verify calibration [cursor here]
3. Assemble components
```

**Step 2**: Click **Sub-Step (⋮)** button

**Step 3**: Type your sub-steps
```
1. Clean equipment
2. Verify calibration
   2.1 Check calibration stickers
   2.2 Verify dates are current
   2.3 Document numbers
3. Assemble components
```

---

### Converting Between Bullets and Numbers

**Bullets → Numbers**: Select items, click **Promote to Step (↑)**

**Numbers → Bullets**: Select items, click **Sub-Bullet (→)**

---

## Heading Auto-Numbering

If enabled, headings automatically number based on their level:

```
Heading 1 → 1, 2, 3, 4...
Heading 2 → 1.1, 1.2, 2.1, 2.2...
Heading 3 → 1.1.1, 1.1.2, 1.2.1...
```

**FDA Style** (if enabled):
```
Heading 1 → 1.0, 2.0, 3.0, 4.0...
Heading 2 → 1.1, 1.2, 2.1, 2.2...
```

**Numbers update automatically** when you:
- Add a heading
- Delete a heading
- Reorder headings

---

## Tips & Best Practices

✅ **DO**:
- Use numbered lists for sequential steps
- Use bullets for details, requirements, or options
- Use sub-steps (2.1, 2.2) for complex procedures
- Press Enter twice to exit bullet lists

❌ **DON'T**:
- Mix bullets and numbers at the same level
- Manually type numbers (use the toolbar buttons instead)
- Create more than 3 levels of nesting (hard to read)

---

## Example: Complete SOP Section

```
5.0 Procedure

5.1 Raw Material Verification

1. Retrieve raw materials from storage
2. Verify each ingredient has:
   • Supplier name
   • Supplier lot number
   • Internal lot number
   • COA on file
   • Organic certification (if applicable)
3. Inspect packaging for defects:
   3.1 Check for tears or punctures
   3.2 Verify seals are intact
   3.3 Look for signs of moisture
4. Record verification in batch record

5.2 Equipment Setup

1. Clean and sanitize all equipment per SOP-SAN-001
2. Verify calibration status:
   2.1 Check calibration stickers
   2.2 Verify dates are current
   2.3 Document calibration numbers
3. Assemble equipment per manufacturer specifications
4. Perform pre-operational check
```

---

## Troubleshooting

**Q: Button is grayed out**
A: Make sure your cursor is in the right type of list:
- Sub-Bullet: Only works in numbered lists
- Promote: Only works in bullet lists
- Sub-Step: Only works in numbered lists

**Q: Numbers don't update**
A: The editor automatically updates numbers. Try:
- Click somewhere else, then back
- Save and reload the document

**Q: Can't exit bullet list**
A: Press **Enter** twice (or press Enter on an empty bullet line)

**Q: How do I manually number things?**
A: Don't! Use the toolbar buttons - they handle numbering automatically and correctly.

---

## Need Help?

See the complete documentation: [GMP_QMS_EDITOR_IMPLEMENTATION.md](GMP_QMS_EDITOR_IMPLEMENTATION.md)
