
-- Extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Shared updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ============ ROLES (authoritative, separate table) ============
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('user','admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE POLICY "own roles readable" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins manage roles" ON public.user_roles
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read own profile" ON public.profiles
  FOR SELECT TO authenticated USING (id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- role column is display-only: never client-writable
CREATE OR REPLACE FUNCTION public.profiles_freeze_role()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role AND NOT public.has_role(auth.uid(),'admin') THEN
    NEW.role := OLD.role;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER profiles_freeze_role BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_freeze_role();

-- auto-provision profile + default role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)))
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ CONVERSATIONS / MESSAGES ============
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own conversations" ON public.conversations
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE INDEX conversations_user_idx ON public.conversations (user_id, updated_at DESC);
CREATE TRIGGER conversations_updated_at BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
  content TEXT NOT NULL,
  language TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "messages in own conversations" ON public.messages
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND c.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND c.user_id = auth.uid()));
CREATE INDEX messages_conversation_idx ON public.messages (conversation_id, created_at);

-- ============ KNOWLEDGE SOURCES ============
CREATE TABLE public.knowledge_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('webpage','book','ebook','pdf','document','digital_archive','ocr_document')),
  author TEXT,
  publisher TEXT,
  url TEXT,
  language TEXT NOT NULL DEFAULT 'ta',
  description TEXT,
  credibility_level TEXT NOT NULL DEFAULT 'unknown' CHECK (credibility_level IN ('trusted','verified','unverified','needs_review','unknown')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived','pending','rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.knowledge_sources TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.knowledge_sources TO authenticated;
GRANT ALL ON public.knowledge_sources TO service_role;
ALTER TABLE public.knowledge_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "active sources are public" ON public.knowledge_sources
  FOR SELECT TO anon, authenticated USING (status = 'active' OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins manage sources" ON public.knowledge_sources
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER knowledge_sources_updated_at BEFORE UPDATE ON public.knowledge_sources
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX knowledge_sources_title_trgm ON public.knowledge_sources USING gin (title gin_trgm_ops);

-- ============ DOCUMENTS ============
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES public.knowledge_sources(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  file_path TEXT,
  content TEXT,
  language TEXT NOT NULL DEFAULT 'ta',
  page_count INT,
  metadata JSONB NOT NULL DEFAULT '{}',
  processing_status TEXT NOT NULL DEFAULT 'pending' CHECK (processing_status IN ('pending','processing','completed','failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.documents TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.documents TO authenticated;
GRANT ALL ON public.documents TO service_role;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "completed documents readable" ON public.documents
  FOR SELECT TO anon, authenticated USING (processing_status = 'completed' OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins manage documents" ON public.documents
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER documents_updated_at BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX documents_source_idx ON public.documents (source_id);

-- ============ DOCUMENT CHUNKS (core RAG table) ============
CREATE TABLE public.document_chunks (
  id BIGSERIAL PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  source_id UUID NOT NULL REFERENCES public.knowledge_sources(id) ON DELETE CASCADE,
  parent_chunk_id BIGINT REFERENCES public.document_chunks(id) ON DELETE SET NULL,
  chunk_type TEXT NOT NULL DEFAULT 'child' CHECK (chunk_type IN ('child','parent')),
  content TEXT NOT NULL,
  normalized_content TEXT,
  page_number INT,
  chapter TEXT,
  section TEXT,
  chunk_index INT NOT NULL DEFAULT 0,
  token_count INT,
  fts TSVECTOR GENERATED ALWAYS AS (to_tsvector('simple', coalesce(normalized_content, content))) STORED,
  embedding VECTOR(768),
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.document_chunks TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.document_chunks TO authenticated;
GRANT ALL ON public.document_chunks TO service_role;
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chunks of public sources readable" ON public.document_chunks
  FOR SELECT TO anon, authenticated USING (
    EXISTS (SELECT 1 FROM public.knowledge_sources s WHERE s.id = source_id AND s.status = 'active')
    OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins manage chunks" ON public.document_chunks
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE INDEX document_chunks_fts_idx ON public.document_chunks USING gin (fts);
CREATE INDEX document_chunks_trgm_idx ON public.document_chunks USING gin (content gin_trgm_ops);
CREATE INDEX document_chunks_doc_idx ON public.document_chunks (document_id, chunk_index);
CREATE INDEX document_chunks_parent_idx ON public.document_chunks (parent_chunk_id);
CREATE INDEX document_chunks_embedding_idx ON public.document_chunks
  USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

-- Semantic search (cosine distance)
CREATE OR REPLACE FUNCTION public.match_document_chunks(
  query_embedding VECTOR(768),
  match_count INT DEFAULT 10,
  similarity_threshold FLOAT DEFAULT 0.0,
  filter_source_ids UUID[] DEFAULT NULL
)
RETURNS TABLE (
  id BIGINT, document_id UUID, source_id UUID, parent_chunk_id BIGINT,
  content TEXT, page_number INT, chapter TEXT, section TEXT, similarity FLOAT
)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT c.id, c.document_id, c.source_id, c.parent_chunk_id,
         c.content, c.page_number, c.chapter, c.section,
         1 - (c.embedding <=> query_embedding) AS similarity
  FROM public.document_chunks c
  WHERE c.embedding IS NOT NULL
    AND c.chunk_type = 'child'
    AND (filter_source_ids IS NULL OR c.source_id = ANY(filter_source_ids))
    AND 1 - (c.embedding <=> query_embedding) >= similarity_threshold
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Keyword/full-text search
CREATE OR REPLACE FUNCTION public.search_document_chunks(
  query_text TEXT,
  match_count INT DEFAULT 10
)
RETURNS TABLE (
  id BIGINT, document_id UUID, source_id UUID, parent_chunk_id BIGINT,
  content TEXT, page_number INT, chapter TEXT, section TEXT, rank FLOAT
)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT c.id, c.document_id, c.source_id, c.parent_chunk_id,
         c.content, c.page_number, c.chapter, c.section,
         ts_rank(c.fts, websearch_to_tsquery('simple', query_text))::FLOAT AS rank
  FROM public.document_chunks c
  WHERE c.fts @@ websearch_to_tsquery('simple', query_text)
  ORDER BY rank DESC
  LIMIT match_count;
$$;

GRANT EXECUTE ON FUNCTION public.match_document_chunks(VECTOR(768), INT, FLOAT, UUID[]) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.search_document_chunks(TEXT, INT) TO anon, authenticated, service_role;

-- ============ CITATIONS ============
CREATE TABLE public.citations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  source_id UUID REFERENCES public.knowledge_sources(id) ON DELETE SET NULL,
  document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  chunk_id BIGINT REFERENCES public.document_chunks(id) ON DELETE SET NULL,
  citation_order INT NOT NULL DEFAULT 1,
  source_title TEXT,
  source_url TEXT,
  snippet TEXT,
  page_number INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.citations TO authenticated;
GRANT ALL ON public.citations TO service_role;
ALTER TABLE public.citations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "citations of own messages" ON public.citations
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.messages m JOIN public.conversations c ON c.id = m.conversation_id
                 WHERE m.id = message_id AND c.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.messages m JOIN public.conversations c ON c.id = m.conversation_id
                 WHERE m.id = message_id AND c.user_id = auth.uid()));
CREATE INDEX citations_message_idx ON public.citations (message_id, citation_order);

-- ============ CULTURAL ============
CREATE TABLE public.cultural_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.cultural_categories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.cultural_categories TO authenticated;
GRANT ALL ON public.cultural_categories TO service_role;
ALTER TABLE public.cultural_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories are public" ON public.cultural_categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admins manage categories" ON public.cultural_categories
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.cultural_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.cultural_categories(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  query_text TEXT,
  image_url TEXT,
  source_ids JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.cultural_items TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.cultural_items TO authenticated;
GRANT ALL ON public.cultural_items TO service_role;
ALTER TABLE public.cultural_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "items are public" ON public.cultural_items FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admins manage items" ON public.cultural_items
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER cultural_items_updated_at BEFORE UPDATE ON public.cultural_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX cultural_items_category_idx ON public.cultural_items (category_id);

-- ============ OCR ============
CREATE TABLE public.ocr_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  original_file_path TEXT,
  file_type TEXT,
  extracted_text TEXT,
  corrected_text TEXT,
  processing_status TEXT NOT NULL DEFAULT 'pending' CHECK (processing_status IN ('pending','processing','completed','failed')),
  page_count INT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ocr_documents TO authenticated;
GRANT ALL ON public.ocr_documents TO service_role;
ALTER TABLE public.ocr_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own ocr documents" ON public.ocr_documents
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER ocr_documents_updated_at BEFORE UPDATE ON public.ocr_documents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX ocr_documents_user_idx ON public.ocr_documents (user_id, created_at DESC);

-- ============ INGESTION JOBS ============
CREATE TABLE public.ingestion_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES public.knowledge_sources(id) ON DELETE CASCADE,
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL CHECK (job_type IN ('ingest','chunk','embed','ocr','reindex')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','completed','failed','cancelled')),
  error_message TEXT,
  progress INT NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ingestion_jobs TO authenticated;
GRANT ALL ON public.ingestion_jobs TO service_role;
ALTER TABLE public.ingestion_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage ingestion jobs" ON public.ingestion_jobs
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE INDEX ingestion_jobs_status_idx ON public.ingestion_jobs (status, created_at DESC);
