/**
 * Tiptap Extension: Smart List Commands
 *
 * Provides GMP/QMS-grade list manipulation commands:
 * - convertToSubBullet: Convert selected numbered items to nested bullets
 * - promoteToStep: Convert nested bullets back to numbered steps
 * - addSubStep: Create nested numbered sub-steps (2.1, 2.2, etc.)
 */

import { Extension } from '@tiptap/core'
import { liftListItem, sinkListItem } from '@tiptap/pm/schema-list'
import { Fragment, Slice } from '@tiptap/pm/model'

export const SmartListCommands = Extension.create({
  name: 'smartListCommands',

  addCommands() {
    return {
      /**
       * FEATURE 1: Smart Sub-Bullet
       * Convert selected ordered list item(s) to nested bullet list items
       */
      convertToSubBullet: () => ({ state, dispatch, tr, commands, chain }) => {
        const { $from, $to, empty } = state.selection
        const { schema } = state

        // Find if we're in a list item
        let listItemDepth = -1
        for (let d = $from.depth; d > 0; d--) {
          if ($from.node(d).type === schema.nodes.listItem) {
            listItemDepth = d
            break
          }
        }

        if (listItemDepth === -1) return false

        // Check if parent is an ordered list
        const listDepth = listItemDepth - 1
        const listNode = $from.node(listDepth)

        if (listNode.type !== schema.nodes.orderedList) return false

        // Execute the transformation:
        // 1. Sink the list item (indent)
        // 2. Change parent list from ordered to bullet
        return chain()
          .command(({ state, dispatch, tr }) => {
            // First, sink the list item
            if (!sinkListItem(schema.nodes.listItem)(state, dispatch)) {
              return false
            }
            return true
          })
          .command(({ state, dispatch, tr }) => {
            // Now find the nested list and convert it to bulletList
            const { $from } = state.selection

            // Find the parent list of the now-nested item
            for (let d = $from.depth; d > 0; d--) {
              const node = $from.node(d)

              if (node.type === schema.nodes.orderedList) {
                const pos = $from.before(d)

                if (dispatch) {
                  // Create a bulletList with the same content
                  const bulletList = schema.nodes.bulletList.create(
                    node.attrs,
                    node.content
                  )

                  tr.replaceWith(pos, pos + node.nodeSize, bulletList)
                  dispatch(tr)
                }
                return true
              }
            }
            return false
          })
          .run()
      },

      /**
       * FEATURE 2: Promote to Step
       * Convert nested bullet list item(s) to top-level numbered steps
       */
      promoteToStep: () => ({ state, dispatch, tr, commands, chain }) => {
        const { $from } = state.selection
        const { schema } = state

        // Find if we're in a bullet list item
        let listItemDepth = -1
        for (let d = $from.depth; d > 0; d--) {
          if ($from.node(d).type === schema.nodes.listItem) {
            listItemDepth = d
            break
          }
        }

        if (listItemDepth === -1) return false

        // Check if parent is a bullet list
        const listDepth = listItemDepth - 1
        const listNode = $from.node(listDepth)

        if (listNode.type !== schema.nodes.bulletList) return false

        // Execute the transformation:
        // 1. Lift the list item (outdent)
        // 2. Change parent list from bullet to ordered
        return chain()
          .command(({ state, dispatch }) => {
            // Lift the list item
            if (!liftListItem(schema.nodes.listItem)(state, dispatch)) {
              return false
            }
            return true
          })
          .command(({ state, dispatch, tr }) => {
            // Find the parent bullet list and convert to orderedList
            const { $from } = state.selection

            for (let d = $from.depth; d > 0; d--) {
              const node = $from.node(d)

              if (node.type === schema.nodes.bulletList) {
                const pos = $from.before(d)

                if (dispatch) {
                  const orderedList = schema.nodes.orderedList.create(
                    node.attrs,
                    node.content
                  )

                  tr.replaceWith(pos, pos + node.nodeSize, orderedList)
                  dispatch(tr)
                }
                return true
              }
            }
            return false
          })
          .run()
      },

      /**
       * FEATURE 3: Add Sub-Step
       * Create a nested numbered list item under the current numbered step
       */
      addSubStep: () => ({ state, dispatch, tr, commands, chain, editor }) => {
        const { $from } = state.selection
        const { schema } = state

        // Find if we're in an ordered list item
        let listItemDepth = -1
        for (let d = $from.depth; d > 0; d--) {
          if ($from.node(d).type === schema.nodes.listItem) {
            listItemDepth = d
            break
          }
        }

        if (listItemDepth === -1) return false

        // Check if parent is an ordered list
        const listDepth = listItemDepth - 1
        const listNode = $from.node(listDepth)

        if (listNode.type !== schema.nodes.orderedList) return false

        // Strategy: Split the current list item and create a nested ordered list
        return chain()
          .command(({ state, dispatch, tr }) => {
            const { $from } = state.selection
            const listItem = $from.node(listItemDepth)

            // Find end of current list item
            const listItemPos = $from.before(listItemDepth)
            const listItemEnd = listItemPos + listItem.nodeSize

            // Check if there's already a nested list
            let hasNestedList = false
            listItem.descendants((node, pos) => {
              if (node.type === schema.nodes.orderedList || node.type === schema.nodes.bulletList) {
                hasNestedList = true
                return false
              }
            })

            if (dispatch) {
              if (hasNestedList) {
                // If there's already a nested list, add to it
                // Find the nested list
                let nestedListPos = -1
                listItem.descendants((node, pos) => {
                  if (node.type === schema.nodes.orderedList) {
                    nestedListPos = listItemPos + pos + 1
                    return false
                  }
                })

                if (nestedListPos !== -1) {
                  // Create new list item
                  const newListItem = schema.nodes.listItem.create(null, schema.nodes.paragraph.create())
                  tr.insert(nestedListPos + 1, newListItem)
                  dispatch(tr)
                  return true
                }
              } else {
                // Create new nested ordered list
                const newListItem = schema.nodes.listItem.create(null, schema.nodes.paragraph.create())
                const nestedList = schema.nodes.orderedList.create(null, newListItem)

                // Insert nested list at end of current list item content, before closing
                const insertPos = listItemEnd - 1
                tr.insert(insertPos, nestedList)

                // Move cursor into the new list item
                tr.setSelection(state.selection.constructor.near(tr.doc.resolve(insertPos + 2)))
                dispatch(tr)
                return true
              }
            }

            return false
          })
          .run()
      }
    }
  },

  addKeyboardShortcuts() {
    return {
      // Enhanced Enter behavior for exiting sub-bullets
      'Enter': ({ editor }) => {
        const { state } = editor
        const { $from, empty } = state.selection
        const { schema } = state

        if (!empty) return false

        // Check if we're in a list item
        let listItemDepth = -1
        for (let d = $from.depth; d > 0; d--) {
          if ($from.node(d).type === schema.nodes.listItem) {
            listItemDepth = d
            break
          }
        }

        if (listItemDepth === -1) return false

        // Get the list item
        const listItem = $from.node(listItemDepth)

        // Check if the list item is empty
        const isEmpty = listItem.content.size === 0 ||
                       (listItem.childCount === 1 &&
                        listItem.child(0).type === schema.nodes.paragraph &&
                        listItem.child(0).content.size === 0)

        if (!isEmpty) return false

        // Check if we're in a bullet list
        const listDepth = listItemDepth - 1
        const listNode = $from.node(listDepth)

        if (listNode.type === schema.nodes.bulletList) {
          // Check if this is a nested list
          if (listDepth > 1) {
            const grandParentNode = $from.node(listDepth - 1)

            if (grandParentNode.type === schema.nodes.listItem) {
              // We're in a nested bullet list
              // Lift out and convert to numbered step
              return editor.chain()
                .liftListItem('listItem')
                .command(({ state, dispatch, tr }) => {
                  // Convert to ordered list
                  const { $from } = state.selection

                  for (let d = $from.depth; d > 0; d--) {
                    const node = $from.node(d)

                    if (node.type === schema.nodes.bulletList) {
                      const pos = $from.before(d)

                      if (dispatch) {
                        const orderedList = schema.nodes.orderedList.create(
                          node.attrs,
                          node.content
                        )

                        tr.replaceWith(pos, pos + node.nodeSize, orderedList)
                        dispatch(tr)
                      }
                      return true
                    }
                  }
                  return false
                })
                .run()
            }
          }
        }

        return false
      }
    }
  }
})
