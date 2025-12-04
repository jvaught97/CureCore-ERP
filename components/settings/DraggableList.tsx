'use client'

import { ReactNode, useState } from 'react'
import { GripVertical } from 'lucide-react'

type DraggableItem = {
  id: string
  [key: string]: any
}

type DraggableListProps<T extends DraggableItem> = {
  items: T[]
  onReorder: (items: T[]) => void
  renderItem: (item: T, index: number) => ReactNode
}

export function DraggableList<T extends DraggableItem>({ items, onReorder, renderItem }: DraggableListProps<T>) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return

    const newItems = [...items]
    const draggedItem = newItems[draggedIndex]
    newItems.splice(draggedIndex, 1)
    newItems.splice(index, 0, draggedItem)

    setDraggedIndex(index)
    onReorder(newItems)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
  }

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div
          key={item.id}
          draggable
          onDragStart={() => handleDragStart(index)}
          onDragOver={(e) => handleDragOver(e, index)}
          onDragEnd={handleDragEnd}
          className={`flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 transition ${
            draggedIndex === index ? 'opacity-50' : 'hover:border-gray-300'
          }`}
        >
          <GripVertical className="h-5 w-5 cursor-grab text-gray-400 active:cursor-grabbing" />
          <div className="flex-1">{renderItem(item, index)}</div>
        </div>
      ))}
    </div>
  )
}
