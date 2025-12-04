'use client'

interface HTMLContentDisplayProps {
  content: string
  className?: string
}

/**
 * Component to safely display HTML content with proper styling for lists, headings, etc.
 * Used for read-only display of rich text content.
 */
export default function HTMLContentDisplay({ content, className = '' }: HTMLContentDisplayProps) {
  return (
    <div
      className={`prose prose-sm max-w-none dark:prose-invert
        prose-headings:font-semibold prose-headings:text-gray-900 dark:prose-headings:text-gray-100
        prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg
        prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-p:leading-relaxed
        prose-strong:text-gray-900 dark:prose-strong:text-gray-100 prose-strong:font-semibold
        prose-ul:list-disc prose-ul:ml-6 prose-ul:space-y-1
        prose-ol:list-decimal prose-ol:ml-6 prose-ol:space-y-1
        prose-li:text-gray-700 dark:prose-li:text-gray-300 prose-li:leading-relaxed
        ${className}`}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  )
}
