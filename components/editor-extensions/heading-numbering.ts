/**
 * Tiptap Extension: Heading Auto-Numbering
 *
 * Provides automatic outline-style numbering for headings:
 * - H1: 1, 2, 3, 4...
 * - H2: 1.1, 1.2, 2.1, 2.2...
 * - H3: 1.1.1, 1.1.2, 1.2.1...
 *
 * Supports FDA-style with .0 suffix (1.0, 2.0) via configuration.
 */

import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

export interface HeadingNumberingOptions {
  enabled: boolean
  fdaStyle: boolean // If true, use 1.0, 2.0 for H1
}

export const HeadingNumbering = Extension.create<HeadingNumberingOptions>({
  name: 'headingNumbering',

  addOptions() {
    return {
      enabled: true,
      fdaStyle: false
    }
  },

  addProseMirrorPlugins() {
    const { enabled, fdaStyle } = this.options

    return [
      new Plugin({
        key: new PluginKey('headingNumbering'),

        state: {
          init(_, state) {
            if (!enabled) return DecorationSet.empty
            return calculateHeadingDecorations(state, fdaStyle)
          },

          apply(tr, oldDecoSet, oldState, newState) {
            if (!enabled) return DecorationSet.empty

            // Recalculate decorations if document changed
            if (tr.docChanged) {
              return calculateHeadingDecorations(newState, fdaStyle)
            }

            // Map decorations through the transaction
            return oldDecoSet.map(tr.mapping, tr.doc)
          }
        },

        props: {
          decorations(state) {
            return this.getState(state)
          }
        }
      })
    ]
  },

  addCommands() {
    return {
      toggleHeadingNumbering: () => ({ commands }) => {
        this.options.enabled = !this.options.enabled
        return true
      },

      setFdaStyle: (fdaStyle: boolean) => ({ commands }) => {
        this.options.fdaStyle = fdaStyle
        return true
      }
    }
  }
})

/**
 * Calculate heading numbers based on document structure
 */
function calculateHeadingDecorations(state: any, fdaStyle: boolean): DecorationSet {
  const decorations: Decoration[] = []

  // Track counters for each heading level
  const counters = [0, 0, 0] // [H1, H2, H3]

  state.doc.descendants((node: any, pos: number) => {
    if (node.type.name === 'heading') {
      const level = node.attrs.level

      if (level >= 1 && level <= 3) {
        // Increment counter for this level
        counters[level - 1]++

        // Reset deeper level counters
        for (let i = level; i < 3; i++) {
          counters[i] = 0
        }

        // Build the number string
        let numberText = ''

        if (level === 1) {
          numberText = fdaStyle ? `${counters[0]}.0` : `${counters[0]}`
        } else if (level === 2) {
          numberText = `${counters[0]}.${counters[1]}`
        } else if (level === 3) {
          numberText = `${counters[0]}.${counters[1]}.${counters[2]}`
        }

        // Create decoration widget that inserts the number before heading text
        const decoration = Decoration.widget(
          pos + 1,
          () => {
            const span = document.createElement('span')
            span.className = 'heading-number'
            span.style.cssText = 'font-weight: 600; margin-right: 0.5em; color: inherit;'
            span.textContent = numberText + ' '
            return span
          },
          {
            side: -1,
            key: `heading-number-${pos}`
          }
        )

        decorations.push(decoration)
      }
    }

    return true
  })

  return DecorationSet.create(state.doc, decorations)
}

/**
 * Helper function to get heading structure for TOC generation
 */
export function getHeadingStructure(doc: any, fdaStyle: boolean = false) {
  const headings: Array<{
    level: number
    text: string
    number: string
    pos: number
  }> = []

  const counters = [0, 0, 0]

  doc.descendants((node: any, pos: number) => {
    if (node.type.name === 'heading') {
      const level = node.attrs.level

      if (level >= 1 && level <= 3) {
        counters[level - 1]++

        for (let i = level; i < 3; i++) {
          counters[i] = 0
        }

        let numberText = ''
        if (level === 1) {
          numberText = fdaStyle ? `${counters[0]}.0` : `${counters[0]}`
        } else if (level === 2) {
          numberText = `${counters[0]}.${counters[1]}`
        } else if (level === 3) {
          numberText = `${counters[0]}.${counters[1]}.${counters[2]}`
        }

        headings.push({
          level,
          text: node.textContent,
          number: numberText,
          pos
        })
      }
    }
  })

  return headings
}
