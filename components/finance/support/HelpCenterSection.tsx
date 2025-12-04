'use client';

import { useEffect, useState } from 'react';
import { BookOpen, Eye, EyeOff, Loader2, Pencil, Plus, Search } from 'lucide-react';
import { listArticles, toggleArticle } from '@/app/(finance)/finance/support/actions';

type Article = {
  id: string;
  slug: string;
  title: string;
  body: string;
  tags: string[];
  is_published: boolean;
};

type HelpCenterSectionProps = {
  showToast: (message: string, type: 'success' | 'error') => void;
  role: string;
};

export function HelpCenterSection({ showToast, role }: HelpCenterSectionProps) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);

  const isFinance = ['admin', 'finance'].includes(role);

  useEffect(() => {
    loadArticles();
  }, []);

  const loadArticles = async () => {
    try {
      setLoading(true);
      const data = await listArticles({ publishedOnly: !isFinance });
      setArticles(data);
    } catch (error: any) {
      showToast(error.message || 'Failed to load articles', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePublish = async (slug: string, isPublished: boolean) => {
    try {
      await toggleArticle(slug, !isPublished);
      showToast('Article updated', 'success');
      await loadArticles();
    } catch (error: any) {
      showToast(error.message || 'Failed to toggle article', 'error');
    }
  };

  const filteredArticles = articles.filter(
    article =>
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.body.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (selectedArticle) {
    return (
      <div className="p-6">
        <button
          type="button"
          onClick={() => setSelectedArticle(null)}
          className="mb-4 text-sm font-medium text-[#174940] hover:underline"
        >
          ← Back to articles
        </button>
        <article className="prose prose-sm max-w-none">
          <h1>{selectedArticle.title}</h1>
          <div className="flex flex-wrap gap-2">
            {selectedArticle.tags.map(tag => (
              <span
                key={tag}
                className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700"
              >
                {tag}
              </span>
            ))}
          </div>
          <div className="mt-4 whitespace-pre-wrap text-gray-700">{selectedArticle.body}</div>
        </article>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search finance help..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-[#174940] focus:outline-none focus:ring-1 focus:ring-[#174940]"
          />
        </div>
        {isFinance && (
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg bg-[#174940] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#123830]"
          >
            <Plus className="h-4 w-4" />
            New Article
          </button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredArticles.length === 0 ? (
          <div className="col-span-full py-12 text-center text-sm text-gray-500">
            No articles found
          </div>
        ) : (
          filteredArticles.map(article => (
            <div
              key={article.id}
              className="cursor-pointer rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
              onClick={() => setSelectedArticle(article)}
            >
              <div className="mb-2 flex items-start justify-between">
                <BookOpen className="h-5 w-5 text-[#174940]" />
                {isFinance && (
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      handleTogglePublish(article.slug, article.is_published);
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    {article.is_published ? (
                      <Eye className="h-4 w-4" />
                    ) : (
                      <EyeOff className="h-4 w-4" />
                    )}
                  </button>
                )}
              </div>
              <h3 className="mb-2 font-semibold text-gray-900">{article.title}</h3>
              <p className="mb-3 line-clamp-2 text-sm text-gray-600">
                {article.body.substring(0, 100)}...
              </p>
              <div className="flex flex-wrap gap-1">
                {article.tags.slice(0, 3).map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
