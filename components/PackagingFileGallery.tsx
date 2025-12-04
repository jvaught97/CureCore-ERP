'use client';

import React, { useState } from 'react';
import { PackagingFile } from '@/types/database';
import { deletePackagingFile } from '@/app/packaging/actions';
import {
  formatFileSize,
  FILE_TYPE_NAMES,
  FILE_CATEGORIES,
} from '@/lib/packaging-constants';

interface PackagingFileGalleryProps {
  files: PackagingFile[];
  onFileDeleted?: () => void;
}

export default function PackagingFileGallery({
  files,
  onFileDeleted,
}: PackagingFileGalleryProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<PackagingFile | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async (fileId: string, fileName: string) => {
    if (!confirm(`Are you sure you want to delete "${fileName}"?`)) {
      return;
    }

    setDeletingId(fileId);
    setError(null);

    try {
      const result = await deletePackagingFile(fileId);

      if (result.success) {
        if (onFileDeleted) {
          onFileDeleted();
        }
      } else {
        setError('error' in result ? result.error : 'Failed to delete file');
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('Delete error:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownload = (file: PackagingFile) => {
    window.open(file.file_url, '_blank');
  };

  const isImageFile = (fileType: string) => {
    return fileType.startsWith('image/');
  };

  const isPdfFile = (fileType: string) => {
    return fileType === 'application/pdf';
  };

  const getCategoryLabel = (category: string) => {
    const cat = FILE_CATEGORIES.find((c) => c.value === category);
    return cat ? cat.label : category;
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      label: 'bg-purple-100 text-purple-800',
      artwork: 'bg-pink-100 text-pink-800',
      spec_sheet: 'bg-blue-100 text-blue-800',
      proof: 'bg-green-100 text-green-800',
      coa: 'bg-yellow-100 text-yellow-800',
      other: 'bg-gray-100 text-gray-800',
    };
    return colors[category] || colors.other;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (files.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
          />
        </svg>
        <p className="mt-2 text-sm text-gray-600">No files uploaded yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <div className="flex items-start">
            <svg
              className="w-5 h-5 text-red-500 mt-0.5 mr-2"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-sm text-red-700">{error}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {files.map((file) => (
          <div
            key={file.id}
            className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow bg-white"
          >
            {/* File preview/icon */}
            <div className="bg-gray-100 h-40 flex items-center justify-center relative">
              {isImageFile(file.file_type) ? (
                <img
                  src={file.file_url}
                  alt={file.file_name}
                  className="w-full h-full object-contain cursor-pointer"
                  onClick={() => setPreviewFile(file)}
                />
              ) : isPdfFile(file.file_type) ? (
                <div className="flex flex-col items-center">
                  <svg
                    className="w-16 h-16 text-red-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-xs text-gray-500 mt-2">PDF</span>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <svg
                    className="w-16 h-16 text-blue-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-xs text-gray-500 mt-2">
                    {FILE_TYPE_NAMES[file.file_type] || 'File'}
                  </span>
                </div>
              )}

              {/* Category badge */}
              <div className="absolute top-2 right-2">
                <span
                  className={`text-xs px-2 py-1 rounded-full font-medium ${getCategoryColor(
                    file.file_category
                  )}`}
                >
                  {getCategoryLabel(file.file_category)}
                </span>
              </div>
            </div>

            {/* File details */}
            <div className="p-3">
              <h4 className="text-sm font-medium text-gray-900 truncate mb-1">
                {file.file_name}
              </h4>
              <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                <span>{formatFileSize(file.file_size)}</span>
                <span>{formatDate(file.created_at)}</span>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleDownload(file)}
                  className="flex-1 px-3 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                >
                  Download
                </button>
                <button
                  onClick={() => handleDelete(file.id, file.file_name)}
                  disabled={deletingId === file.id}
                  className="px-3 py-1.5 bg-red-600 text-white text-xs rounded hover:bg-red-700 disabled:bg-gray-300 transition-colors"
                >
                  {deletingId === file.id ? (
                    <svg
                      className="animate-spin h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                  ) : (
                    'Delete'
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Preview Modal */}
      {previewFile && isImageFile(previewFile.file_type) && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setPreviewFile(null)}
        >
          <div className="max-w-4xl max-h-full">
            <div className="bg-white rounded-lg overflow-hidden">
              <div className="p-4 border-b flex items-center justify-between">
                <h3 className="text-lg font-medium">{previewFile.file_name}</h3>
                <button
                  onClick={() => setPreviewFile(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              <div className="p-4">
                <img
                  src={previewFile.file_url}
                  alt={previewFile.file_name}
                  className="max-w-full max-h-[70vh] mx-auto"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
