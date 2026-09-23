CREATE OR REPLACE FUNCTION public.source_library_stats()
RETURNS TABLE(source_id uuid, document_count integer, processing_status text, page_count integer, chunk_count integer, embedded_count integer)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
  SELECT s.id AS source_id,
         COALESCE(d.doc_count, 0)::int AS document_count,
         COALESCE(d.status, 'pending')::text AS processing_status,
         COALESCE(d.pages, 0)::int AS page_count,
         COALESCE(c.chunks, 0)::int AS chunk_count,
         COALESCE(c.embedded, 0)::int AS embedded_count
  FROM public.knowledge_sources s
  LEFT JOIN (
    SELECT source_id,
           COUNT(*) AS doc_count,
           SUM(COALESCE(page_count, 0)) AS pages,
           CASE
             WHEN BOOL_OR(processing_status = 'processing') THEN 'processing'
             WHEN BOOL_OR(processing_status = 'completed') THEN 'completed'
             WHEN BOOL_OR(processing_status = 'failed') THEN 'failed'
             ELSE 'pending'
           END AS status
    FROM public.documents GROUP BY source_id
  ) d ON d.source_id = s.id
  LEFT JOIN (
    SELECT source_id,
           COUNT(*) FILTER (WHERE chunk_type = 'child') AS chunks,
           COUNT(*) FILTER (WHERE chunk_type = 'child' AND embedding IS NOT NULL) AS embedded
    FROM public.document_chunks GROUP BY source_id
  ) c ON c.source_id = s.id
  WHERE s.status = 'active';
$function$;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.source_library_stats() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.search_document_chunks(text, integer) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.match_document_chunks(vector, integer, double precision, uuid[]) TO anon, authenticated, service_role;