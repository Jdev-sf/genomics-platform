-- prisma/migrations/20250531083038_optimized_indices/migration.sql

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ===========================================
-- CRITICAL PERFORMANCE INDICES
-- ===========================================

-- 1. VARIANTS - Core query patterns
CREATE INDEX IF NOT EXISTS "idx_variants_gene_clinical_position" 
ON "variants" ("gene_id", "clinical_significance", "position" DESC);

-- 2. VARIANTS - Genomic region queries (most frequent)
CREATE INDEX IF NOT EXISTS "idx_variants_chr_pos_range" 
ON "variants" ("chromosome", "position") 
WHERE "position" IS NOT NULL;

-- 3. VARIANTS - Clinical filtering (dashboard queries)
CREATE INDEX IF NOT EXISTS "idx_variants_clinical_impact" 
ON "variants" ("clinical_significance", "impact", "frequency") 
WHERE "clinical_significance" IS NOT NULL;

-- 4. VARIANTS - Composite for complex filters
CREATE INDEX IF NOT EXISTS "idx_variants_multi_filter" 
ON "variants" ("chromosome", "clinical_significance", "gene_id", "position");

-- 5. GENES - Full-text search optimized
CREATE INDEX IF NOT EXISTS "idx_genes_symbol_trgm" 
ON "genes" USING gin ("symbol" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "idx_genes_name_trgm" 
ON "genes" USING gin ("name" gin_trgm_ops);

-- 6. GENES - Location and stats queries
CREATE INDEX IF NOT EXISTS "idx_genes_chr_strand_pos" 
ON "genes" ("chromosome", "strand", "start_position", "end_position") 
WHERE "start_position" IS NOT NULL AND "end_position" IS NOT NULL;

-- 7. GENES - Biotype filtering
CREATE INDEX IF NOT EXISTS "idx_genes_biotype_chr" 
ON "genes" ("biotype", "chromosome") 
WHERE "biotype" IS NOT NULL;

-- ===========================================
-- AGGREGATION OPTIMIZATION INDICES
-- ===========================================

-- 8. Variants count per gene (for stats)
CREATE INDEX IF NOT EXISTS "idx_variants_gene_count" 
ON "variants" ("gene_id");

-- 9. Pathogenic variants quick lookup
CREATE INDEX IF NOT EXISTS "idx_variants_pathogenic_only" 
ON "variants" ("gene_id", "position", "variant_id") 
WHERE "clinical_significance" IN ('Pathogenic', 'Likely pathogenic');

-- 10. Frequency-based queries
CREATE INDEX IF NOT EXISTS "idx_variants_frequency_rare" 
ON "variants" ("frequency", "clinical_significance") 
WHERE "frequency" IS NOT NULL AND "frequency" < 0.01;

-- ===========================================
-- ANNOTATION & RELATIONSHIP INDICES
-- ===========================================

-- 11. Annotations with source info
CREATE INDEX IF NOT EXISTS "idx_annotations_variant_source" 
ON "annotations" ("variant_id", "source_id", "annotation_type", "created_at" DESC);

-- 12. Gene aliases for search
CREATE INDEX IF NOT EXISTS "idx_gene_aliases_search" 
ON "gene_aliases" ("alias", "gene_id");

-- 13. Gene aliases trigram search
CREATE INDEX IF NOT EXISTS "idx_gene_aliases_trgm" 
ON "gene_aliases" USING gin ("alias" gin_trgm_ops);

-- ===========================================
-- USER & SESSION OPTIMIZATION (FIXED)
-- ===========================================

-- 14. User sessions for auth (without NOW() function)
CREATE INDEX IF NOT EXISTS "idx_sessions_token_expires" 
ON "sessions" ("token", "expires_at");

-- 15. User role permissions (simplified)
CREATE INDEX IF NOT EXISTS "idx_users_role_active" 
ON "users" ("role_id", "is_active") 
WHERE "is_active" = true;

-- ===========================================
-- ADDITIONAL PERFORMANCE INDICES
-- ===========================================

-- 16. Audit logs for recent activity
CREATE INDEX IF NOT EXISTS "idx_audit_logs_user_recent" 
ON "audit_logs" ("user_id", "created_at" DESC);

-- 17. Active sessions only
CREATE INDEX IF NOT EXISTS "idx_sessions_active_tokens" 
ON "sessions" ("token") 
WHERE "expires_at" > '2024-01-01'::timestamp;

-- 18. Variant ID search optimization
CREATE INDEX IF NOT EXISTS "idx_variants_variant_id_search" 
ON "variants" ("variant_id") 
WHERE "variant_id" IS NOT NULL;

-- 19. Gene symbol exact match
CREATE INDEX IF NOT EXISTS "idx_genes_symbol_exact" 
ON "genes" ("symbol") 
WHERE "symbol" IS NOT NULL;

-- 20. Clinical significance quick lookup
CREATE INDEX IF NOT EXISTS "idx_variants_clinical_quick" 
ON "variants" ("clinical_significance") 
WHERE "clinical_significance" IS NOT NULL;