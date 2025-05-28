-- scripts/add-performance-indices.sql
-- Run this AFTER all tables are created

-- Enable pg_trgm extension for trigram search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 1. Critical performance index for variants filtering and sorting
CREATE INDEX IF NOT EXISTS "idx_variants_gene_clinical_freq" 
ON "variants" ("gene_id", "clinical_significance", "frequency" DESC NULLS LAST);

-- 2. Optimized B-tree index for genomic position queries
CREATE INDEX IF NOT EXISTS "idx_variants_chromosome_position_btree" 
ON "variants" ("chromosome", "position");

-- 3. Composite index for variant lookups by location
CREATE INDEX IF NOT EXISTS "idx_variants_location_alleles" 
ON "variants" ("chromosome", "position", "reference_allele", "alternate_allele");

-- 4. Trigram index for fuzzy gene symbol search
CREATE INDEX IF NOT EXISTS "idx_genes_symbol_trgm" 
ON "genes" USING gin ("symbol" gin_trgm_ops);

-- 5. Trigram index for gene name search
CREATE INDEX IF NOT EXISTS "idx_genes_name_trgm" 
ON "genes" USING gin ("name" gin_trgm_ops);

-- 6. Index for gene position range queries
CREATE INDEX IF NOT EXISTS "idx_genes_chromosome_positions" 
ON "genes" ("chromosome", "start_position", "end_position") 
WHERE "start_position" IS NOT NULL AND "end_position" IS NOT NULL;

-- 7. Index for audit log queries (user activity tracking)
CREATE INDEX IF NOT EXISTS "idx_audit_logs_user_created" 
ON "audit_logs" ("user_id", "created_at" DESC);

-- 8. Index for audit log entity queries
CREATE INDEX IF NOT EXISTS "idx_audit_logs_entity_action" 
ON "audit_logs" ("entity_type", "entity_id", "action");

-- 9. Index for session management
CREATE INDEX IF NOT EXISTS "idx_sessions_user_expires" 
ON "sessions" ("user_id", "expires_at") WHERE "expires_at" > NOW();

-- 10. Index for active user sessions
CREATE INDEX IF NOT EXISTS "idx_sessions_token_active" 
ON "sessions" ("token") WHERE "expires_at" > NOW();

-- 11. Partial index for pathogenic variants (frequently queried)
CREATE INDEX IF NOT EXISTS "idx_variants_pathogenic" 
ON "variants" ("gene_id", "position") 
WHERE "clinical_significance" IN ('Pathogenic', 'Likely pathogenic');

-- 12. Index for variant frequency filters
CREATE INDEX IF NOT EXISTS "idx_variants_frequency_range" 
ON "variants" ("frequency") 
WHERE "frequency" IS NOT NULL;

-- 13. Index for annotation source queries
CREATE INDEX IF NOT EXISTS "idx_annotations_source_type" 
ON "annotations" ("source_id", "annotation_type", "created_at" DESC);

-- 14. Index for gene alias lookups
CREATE INDEX IF NOT EXISTS "idx_gene_aliases_alias_type" 
ON "gene_aliases" ("alias", "alias_type");

-- 15. Composite index for user role permissions
CREATE INDEX IF NOT EXISTS "idx_users_role_active" 
ON "users" ("role_id", "is_active") WHERE "is_active" = true;

-- Confirm indices were created
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
    AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;