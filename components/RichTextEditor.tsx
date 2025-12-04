'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Undo,
  Redo,
  IndentIncrease,
  IndentDecrease,
  ArrowUpFromLine,
  ChevronRight,
  ListTree
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { HeadingNumbering } from './editor-extensions/heading-numbering'
import { SmartListCommands } from './editor-extensions/smart-list-commands'

interface RichTextEditorProps {
  content: string
  onChange: (html: string) => void
  placeholder?: string
  minHeight?: string
  mode?: 'light' | 'dark'
  enableHeadingNumbering?: boolean
  fdaStyle?: boolean
}

export default function RichTextEditor({
  content,
  onChange,
  placeholder = 'Start typing...',
  minHeight = '200px',
  mode = 'light',
  enableHeadingNumbering = false,
  fdaStyle = false
}: RichTextEditorProps) {
  const [headingNumberingEnabled, setHeadingNumberingEnabled] = useState(enableHeadingNumbering)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3]
        },
        orderedList: {
          HTMLAttributes: {
            class: 'list-decimal ml-6 space-y-1'
          }
        },
        bulletList: {
          HTMLAttributes: {
            class: 'list-disc ml-6 space-y-1'
          }
        },
        listItem: {
          HTMLAttributes: {
            class: 'leading-relaxed'
          }
        }
      }),
      Underline,
      HeadingNumbering.configure({
        enabled: enableHeadingNumbering,
        fdaStyle: fdaStyle
      }),
      SmartListCommands
    ],
    content: content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: `prose prose-sm max-w-none focus:outline-none ${mode === 'dark' ? 'prose-invert' : ''}`
      },
      handleKeyDown: (view, event) => {
        // Handle Tab for indent in lists
        if (event.key === 'Tab' && !event.shiftKey) {
          // Check if we're in a list item
          const { $from } = view.state.selection
          const listItemType = view.state.schema.nodes.listItem

          if ($from.node(-1)?.type === listItemType) {
            event.preventDefault()
            // Indent the current list item
            return editor?.chain().focus().sinkListItem('listItem').run() || false
          }
        }

        // Handle Shift+Tab for outdent in lists
        if (event.key === 'Tab' && event.shiftKey) {
          // Check if we're in a list item
          const { $from } = view.state.selection
          const listItemType = view.state.schema.nodes.listItem

          if ($from.node(-1)?.type === listItemType) {
            event.preventDefault()
            // Outdent the current list item
            return editor?.chain().focus().liftListItem('listItem').run() || false
          }
        }

        return false
      }
    },
    immediatelyRender: false
  })

  // Update editor content when prop changes (for form resets, etc.)
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content)
    }
  }, [content, editor])

  if (!editor) {
    return null
  }

  const ToolbarButton = ({
    onClick,
    isActive = false,
    disabled = false,
    children,
    title
  }: {
    onClick: () => void
    isActive?: boolean
    disabled?: boolean
    children: React.ReactNode
    title: string
  }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-2 rounded transition-colors ${
        isActive
          ? 'bg-blue-500 text-white'
          : mode === 'dark'
          ? 'text-gray-300 hover:bg-gray-700'
          : 'text-gray-700 hover:bg-gray-100'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      {children}
    </button>
  )

  const ToolbarDivider = () => (
    <div className={`w-px h-6 ${mode === 'dark' ? 'bg-gray-700' : 'bg-gray-300'}`} />
  )

  return (
    <div
      className={`border rounded-lg overflow-hidden ${
        mode === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-300 bg-white'
      }`}
    >
      {/* Toolbar */}
      <div
        className={`flex items-center gap-1 p-2 border-b flex-wrap ${
          mode === 'dark' ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-gray-50'
        }`}
      >
        {/* Text Formatting */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
          title="Bold (Ctrl+B)"
        >
          <Bold className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
          title="Italic (Ctrl+I)"
        >
          <Italic className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          isActive={editor.isActive('underline')}
          title="Underline (Ctrl+U)"
        >
          <UnderlineIcon className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarDivider />

        {/* Headings */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          isActive={editor.isActive('heading', { level: 1 })}
          title="Heading 1"
        >
          <Heading1 className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor.isActive('heading', { level: 2 })}
          title="Heading 2"
        >
          <Heading2 className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          isActive={editor.isActive('heading', { level: 3 })}
          title="Heading 3"
        >
          <Heading3 className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarDivider />

        {/* Lists */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
          title="Bullet List"
        >
          <List className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive('orderedList')}
          title="Numbered List"
        >
          <ListOrdered className="w-4 h-4" />
        </ToolbarButton>

        {/* Indent/Outdent */}
        <ToolbarButton
          onClick={() => editor.chain().focus().sinkListItem('listItem').run()}
          disabled={!editor.can().sinkListItem('listItem')}
          title="Indent (Tab)"
        >
          <IndentIncrease className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().liftListItem('listItem').run()}
          disabled={!editor.can().liftListItem('listItem')}
          title="Outdent (Shift+Tab)"
        >
          <IndentDecrease className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarDivider />

        {/* GMP/QMS Smart List Commands */}
        <ToolbarButton
          onClick={() => editor.chain().focus().convertToSubBullet().run()}
          disabled={!editor.isActive('orderedList')}
          title="Convert to Sub-Bullet (nest as bullets under previous step)"
        >
          <ChevronRight className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().promoteToStep().run()}
          disabled={!editor.isActive('bulletList')}
          title="Promote to Step (convert bullets to numbered steps)"
        >
          <ArrowUpFromLine className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().addSubStep().run()}
          disabled={!editor.isActive('orderedList')}
          title="Add Sub-Step (create nested numbered list)"
        >
          <ListTree className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarDivider />

        {/* Undo/Redo */}
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Undo (Ctrl+Z)"
        >
          <Undo className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Redo (Ctrl+Shift+Z)"
        >
          <Redo className="w-4 h-4" />
        </ToolbarButton>
      </div>

      {/* Editor Content */}
      <div
        className={`px-4 py-3 ${mode === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}
        style={{ minHeight }}
      >
        <EditorContent editor={editor} placeholder={placeholder} />
      </div>
    </div>
  )
}
