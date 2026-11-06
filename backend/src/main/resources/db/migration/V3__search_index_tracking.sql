alter table document add column search_indexed_version bigint;

create index ix_document_search_stale on document (id)
    where deleted_at is null and (search_indexed_version is null or search_indexed_version <> lock_version);
