/**
 * Constants and configuration for packaging product specifications
 */

// Packaging categories
export const PACKAGING_CATEGORIES = [
  'Bottles',
  'Caps',
  'Labels',
  'Seals',
  'Boxes',
  'Other',
] as const;

export type PackagingCategory = typeof PACKAGING_CATEGORIES[number];

// Label sizes (common industry standard sizes)
export const LABEL_SIZES = [
  { value: '2x3', label: '2" x 3"' },
  { value: '3x5', label: '3" x 5"' },
  { value: '4x6', label: '4" x 6"' },
  { value: '2x4', label: '2" x 4"' },
  { value: '3x4', label: '3" x 4"' },
  { value: '50x75mm', label: '50mm x 75mm' },
  { value: '76x127mm', label: '76mm x 127mm' },
  { value: '100x150mm', label: '100mm x 150mm' },
  { value: 'custom', label: 'Custom Size' },
] as const;

// Finish options (for labels)
export const FINISH_OPTIONS = [
  { value: 'glossy', label: 'Glossy' },
  { value: 'matte', label: 'Matte' },
  { value: 'semi-gloss', label: 'Semi-Gloss' },
  { value: 'satin', label: 'Satin' },
  { value: 'laminated', label: 'Laminated' },
  { value: 'uncoated', label: 'Uncoated' },
] as const;

// Bottle capacities (common sizes in CBD/supplement industry)
export const BOTTLE_CAPACITIES = [
  { value: '15ml', label: '15ml (0.5 oz)' },
  { value: '30ml', label: '30ml (1 oz)' },
  { value: '60ml', label: '60ml (2 oz)' },
  { value: '100ml', label: '100ml (3.4 oz)' },
  { value: '120ml', label: '120ml (4 oz)' },
  { value: '250ml', label: '250ml (8.5 oz)' },
  { value: '500ml', label: '500ml (16.9 oz)' },
  { value: '1000ml', label: '1000ml (33.8 oz)' },
  { value: 'custom', label: 'Custom Capacity' },
] as const;

// Neck sizes (bottle opening sizes)
export const NECK_SIZES = [
  { value: '13mm', label: '13mm (13-415)' },
  { value: '15mm', label: '15mm (15-415)' },
  { value: '18mm', label: '18mm (18-415)' },
  { value: '20mm', label: '20mm (20-410)' },
  { value: '24mm', label: '24mm (24-410)' },
  { value: '28mm', label: '28mm (28-400)' },
  { value: '38mm', label: '38mm (38-400)' },
  { value: '53mm', label: '53mm (53-400)' },
  { value: 'custom', label: 'Custom Size' },
] as const;

// Closure types (for caps)
export const CLOSURE_TYPES = [
  { value: 'screw-cap', label: 'Screw Cap' },
  { value: 'flip-top', label: 'Flip Top' },
  { value: 'pump', label: 'Pump' },
  { value: 'dropper', label: 'Dropper' },
  { value: 'spray', label: 'Spray' },
  { value: 'twist-off', label: 'Twist Off' },
  { value: 'child-resistant', label: 'Child Resistant' },
  { value: 'tamper-evident', label: 'Tamper Evident' },
  { value: 'continuous-thread', label: 'Continuous Thread' },
] as const;

// Liner types (for caps)
export const LINER_TYPES = [
  { value: 'foam', label: 'Foam Liner' },
  { value: 'plastisol', label: 'Plastisol' },
  { value: 'induction-seal', label: 'Induction Seal' },
  { value: 'pe-foam', label: 'PE Foam' },
  { value: 'pressure-sensitive', label: 'Pressure Sensitive' },
  { value: 'pulp', label: 'Pulp Liner' },
  { value: 'none', label: 'No Liner' },
] as const;

// Material options by category
export const MATERIALS_BY_CATEGORY = {
  Bottles: [
    { value: 'glass-amber', label: 'Amber Glass' },
    { value: 'glass-clear', label: 'Clear Glass' },
    { value: 'glass-cobalt', label: 'Cobalt Blue Glass' },
    { value: 'pet-clear', label: 'Clear PET Plastic' },
    { value: 'pet-amber', label: 'Amber PET Plastic' },
    { value: 'hdpe', label: 'HDPE Plastic' },
    { value: 'ldpe', label: 'LDPE Plastic' },
  ],
  Caps: [
    { value: 'polypropylene', label: 'Polypropylene (PP)' },
    { value: 'hdpe', label: 'HDPE Plastic' },
    { value: 'ldpe', label: 'LDPE Plastic' },
    { value: 'aluminum', label: 'Aluminum' },
    { value: 'phenolic', label: 'Phenolic' },
  ],
  Labels: [
    { value: 'paper-white', label: 'White Paper' },
    { value: 'paper-kraft', label: 'Kraft Paper' },
    { value: 'vinyl', label: 'Vinyl' },
    { value: 'polyester', label: 'Polyester' },
    { value: 'bopp', label: 'BOPP (Polypropylene)' },
    { value: 'metalized', label: 'Metalized Film' },
  ],
  Seals: [
    { value: 'induction', label: 'Induction Seal' },
    { value: 'pressure-sensitive', label: 'Pressure Sensitive' },
    { value: 'shrink-band', label: 'Shrink Band' },
    { value: 'tamper-evident', label: 'Tamper Evident' },
  ],
  Boxes: [
    { value: 'corrugated', label: 'Corrugated Cardboard' },
    { value: 'chipboard', label: 'Chipboard' },
    { value: 'kraft', label: 'Kraft Paper' },
    { value: 'white-cardboard', label: 'White Cardboard' },
    { value: 'rigid', label: 'Rigid Board' },
  ],
  Other: [
    { value: 'plastic', label: 'Plastic' },
    { value: 'paper', label: 'Paper' },
    { value: 'metal', label: 'Metal' },
    { value: 'composite', label: 'Composite' },
  ],
} as const;

// Color options (for bottles, caps)
export const COLOR_OPTIONS = [
  { value: 'clear', label: 'Clear' },
  { value: 'amber', label: 'Amber' },
  { value: 'cobalt-blue', label: 'Cobalt Blue' },
  { value: 'white', label: 'White' },
  { value: 'black', label: 'Black' },
  { value: 'green', label: 'Green' },
  { value: 'brown', label: 'Brown' },
  { value: 'natural', label: 'Natural' },
  { value: 'custom', label: 'Custom Color' },
] as const;

// Box dimension presets (L x W x H in inches)
export const BOX_DIMENSION_PRESETS = [
  { value: '4x4x4', label: '4" x 4" x 4"' },
  { value: '6x4x2', label: '6" x 4" x 2"' },
  { value: '8x6x4', label: '8" x 6" x 4"' },
  { value: '10x8x6', label: '10" x 8" x 6"' },
  { value: '12x9x3', label: '12" x 9" x 3"' },
  { value: 'custom', label: 'Custom Dimensions' },
] as const;

// Weight capacity options (for boxes)
export const WEIGHT_CAPACITY_OPTIONS = [
  { value: '1lb', label: '1 lb (0.45 kg)' },
  { value: '2lb', label: '2 lb (0.9 kg)' },
  { value: '5lb', label: '5 lb (2.3 kg)' },
  { value: '10lb', label: '10 lb (4.5 kg)' },
  { value: '20lb', label: '20 lb (9 kg)' },
  { value: '50lb', label: '50 lb (23 kg)' },
  { value: 'custom', label: 'Custom Weight' },
] as const;

// File categories for packaging files
export const FILE_CATEGORIES = [
  { value: 'label', label: 'Label Design' },
  { value: 'artwork', label: 'Artwork/Graphics' },
  { value: 'spec_sheet', label: 'Specification Sheet' },
  { value: 'proof', label: 'Proof/Sample' },
  { value: 'coa', label: 'Certificate of Analysis' },
  { value: 'other', label: 'Other' },
] as const;

export type FileCategory = typeof FILE_CATEGORIES[number]['value'];

// Accepted file MIME types for uploads
export const ACCEPTED_FILE_TYPES = {
  'application/pdf': ['.pdf'],
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/svg+xml': ['.svg'],
  'application/postscript': ['.ai', '.eps'],
  'application/illustrator': ['.ai'],
} as const;

// File type display names
export const FILE_TYPE_NAMES: Record<string, string> = {
  'application/pdf': 'PDF Document',
  'image/png': 'PNG Image',
  'image/jpeg': 'JPEG Image',
  'image/svg+xml': 'SVG Vector',
  'application/postscript': 'Adobe Illustrator',
  'application/illustrator': 'Adobe Illustrator',
};

// Maximum file size (10MB in bytes)
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Human-readable file size
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

// Get file extension from filename
export function getFileExtension(filename: string): string {
  return filename.slice(((filename.lastIndexOf('.') - 1) >>> 0) + 2).toLowerCase();
}

// Validate file type
export function isValidFileType(file: File): boolean {
  return Object.keys(ACCEPTED_FILE_TYPES).includes(file.type) ||
    file.type === 'application/illustrator';
}

// Get category-specific fields based on packaging type
export function getCategoryFields(category: PackagingCategory) {
  switch (category) {
    case 'Labels':
      return ['label_size', 'finish', 'material'] as const;
    case 'Bottles':
      return ['capacity', 'neck_size', 'material', 'color'] as const;
    case 'Caps':
      return ['closure_type', 'liner_type', 'color', 'material'] as const;
    case 'Boxes':
      return ['dimensions', 'weight_capacity', 'material'] as const;
    case 'Seals':
      return ['material'] as const;
    case 'Other':
      return ['material'] as const;
    default:
      return [] as const;
  }
}
