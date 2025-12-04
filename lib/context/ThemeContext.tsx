'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { createClient } from '@/utils/supabase/client'

export type ThemeMode = 'light' | 'dark' | 'neon'

type ThemeContextType = {
  mode: ThemeMode
  setMode: (mode: ThemeMode) => void
  isDarkMode: boolean
  isNeonMode: boolean
  primaryColor: string
  secondaryColor: string
  toggleDarkMode: () => void
  updateColors: (primary: string, secondary?: string) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('light')
  const [primaryColor, setPrimaryColor] = useState('#174940')
  const [secondaryColor, setSecondaryColor] = useState('#2d7a67')

  // Derived values for backwards compatibility
  const isDarkMode = mode === 'dark'
  const isNeonMode = mode === 'neon'

  useEffect(() => {
    loadTheme()
  }, [])

  useEffect(() => {
    applyTheme()
  }, [mode, primaryColor, secondaryColor])

  async function loadTheme() {
    const supabase = createClient()

    // Load from localStorage first
    const savedMode = (localStorage.getItem('themeMode') as ThemeMode) || 'light'
    const savedPrimaryColor = localStorage.getItem('primaryColor') || '#174940'
    const savedSecondaryColor = localStorage.getItem('secondaryColor') || '#2d7a67'

    setModeState(savedMode)
    setPrimaryColor(savedPrimaryColor)
    setSecondaryColor(savedSecondaryColor)

    try {
      const { data, error } = await supabase
        .from('org_settings')
        .select('dark_mode, primary_color, secondary_color')
        .single()

      if (data && !error) {
        // Convert dark_mode boolean to theme mode for backwards compatibility
        const dbMode: ThemeMode = data.dark_mode ? 'dark' : 'light'
        setModeState(dbMode)
        setPrimaryColor(data.primary_color || '#174940')
        setSecondaryColor(data.secondary_color || '#2d7a67')
      }
    } catch (err) {
      // Ignore errors if org_settings table doesn't exist yet
      console.log('Could not load org_settings, using defaults')
    }
  }

  function applyTheme() {
    const root = document.documentElement

    // Apply dark mode class (for backwards compatibility with existing dark mode styles)
    if (mode === 'dark' || mode === 'neon') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }

    // Apply CSS variables for colors
    root.style.setProperty('--color-primary', primaryColor)
    root.style.setProperty('--color-secondary', secondaryColor || primaryColor)

    // Save to localStorage as fallback
    localStorage.setItem('themeMode', mode)
    localStorage.setItem('darkMode', String(mode === 'dark')) // backwards compatibility
    localStorage.setItem('primaryColor', primaryColor)
    localStorage.setItem('secondaryColor', secondaryColor)
  }

  function setMode(newMode: ThemeMode) {
    setModeState(newMode)
  }

  function toggleDarkMode() {
    setModeState((prev) => prev === 'dark' ? 'light' : 'dark')
  }

  function updateColors(primary: string, secondary?: string) {
    setPrimaryColor(primary)
    if (secondary) {
      setSecondaryColor(secondary)
    }
  }

  return (
    <ThemeContext.Provider value={{ mode, setMode, isDarkMode, isNeonMode, primaryColor, secondaryColor, toggleDarkMode, updateColors }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
