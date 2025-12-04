# RAG Plan

Future enhancement: tenant-aware knowledge base with pgvector.

```sql
-- per-tenant knowledge base (pgvector)
create table knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  title text,
  content text not null,
  embedding vector(1536)
);
-- RLS: rows visible only to the user’s org
```

Plan: embed uploaded SOPs/policy docs, store embeddings per org, retrieve top-k via cosine similarity, summarize, and include in the Ask-mode context block.
