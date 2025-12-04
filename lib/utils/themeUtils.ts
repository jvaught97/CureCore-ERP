import { ThemeMode } from '@/lib/context/ThemeContext'

/**
 * Get the background class for the given theme mode
 */
export function getBackgroundClass(mode: ThemeMode): string {
  switch (mode) {
    case 'neon':
      return 'bg-gradient-to-br from-[#020617] via-[#031C1E] to-[#041F33]'
    case 'dark':
      return 'bg-gray-900'
    default:
      return 'bg-gray-50'
  }
}

/**
 * Get the primary text color for the given theme mode
 */
export function getTextColor(mode: ThemeMode): string {
  return mode === 'neon' ? 'text-white' : mode === 'dark' ? 'text-gray-100' : 'text-gray-900'
}

/**
 * Get the muted text color for the given theme mode
 */
export function getTextMuted(mode: ThemeMode): string {
  return mode === 'neon' ? 'text-white/70' : mode === 'dark' ? 'text-gray-400' : 'text-gray-600'
}

/**
 * Get the light text color for the given theme mode
 */
export function getTextLight(mode: ThemeMode): string {
  return mode === 'neon' ? 'text-white/60' : mode === 'dark' ? 'text-gray-500' : 'text-gray-500'
}

/**
 * Get the card background class for the given theme mode
 */
export function getCardBackground(mode: ThemeMode): string {
  return mode === 'neon' ? 'bg-white/10 backdrop-blur' : mode === 'dark' ? 'bg-gray-800' : 'bg-white'
}

/**
 * Get the border color for the given theme mode
 */
export function getBorderColor(mode: ThemeMode): string {
  return mode === 'neon' ? 'border-white/20' : mode === 'dark' ? 'border-gray-700' : 'border-gray-200'
}

/**
 * Get the hover border color for cards in the given theme mode
 */
export function getCardHoverBorder(mode: ThemeMode): string {
  return mode === 'neon' ? 'border-[#48A999]/70' : 'border-[#174940]'
}

/**
 * Get the input background class for the given theme mode
 */
export function getInputBackground(mode: ThemeMode): string {
  return mode === 'neon' ? 'bg-white/5 border-white/20' : mode === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
}

/**
 * Get the input text color for the given theme mode
 */
export function getInputTextColor(mode: ThemeMode): string {
  return mode === 'neon' ? 'text-white placeholder:text-white/50' : mode === 'dark' ? 'text-gray-100 placeholder:text-gray-400' : 'text-gray-900 placeholder:text-gray-500'
}

/**
 * Get button classes for primary action buttons
 */
export function getPrimaryButtonClass(mode: ThemeMode): string {
  return mode === 'neon'
    ? 'bg-[#48A999] hover:bg-[#48A999]/80 text-white'
    : 'bg-[#174940] hover:bg-[#2d7a67] text-white'
}

/**
 * Get button classes for secondary action buttons
 */
export function getSecondaryButtonClass(mode: ThemeMode): string {
  return mode === 'neon'
    ? 'border border-white/20 text-white hover:bg-white/10'
    : mode === 'dark'
    ? 'border border-gray-600 text-gray-100 hover:bg-gray-700'
    : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
}

/**
 * Get the accent color (neon teal or primary brand color)
 */
export function getAccentColor(mode: ThemeMode): string {
  return mode === 'neon' ? '#48A999' : '#174940'
}

/**
 * Get table header background
 */
export function getTableHeaderBg(mode: ThemeMode): string {
  return mode === 'neon' ? 'bg-white/5' : mode === 'dark' ? 'bg-gray-800' : 'bg-gray-50'
}

/**
 * Get table row hover background
 */
export function getTableRowHover(mode: ThemeMode): string {
  return mode === 'neon' ? 'hover:bg-white/5' : mode === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
}
