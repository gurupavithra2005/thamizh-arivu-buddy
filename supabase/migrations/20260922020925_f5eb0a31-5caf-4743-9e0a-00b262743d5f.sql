GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.source_library_stats() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.search_document_chunks(text, integer) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.match_document_chunks(vector, integer, double precision, uuid[]) TO anon, authenticated, service_role;