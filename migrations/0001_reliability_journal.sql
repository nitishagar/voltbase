-- S6 placeholder: future D1 shape for the transition-only journal (ADR-002 §W1).
--
-- NOT wired in v0.1: no D1 binding exists in any wrangler.jsonc (IS-06
-- null-cache default — memory + prebuilt artifact only). Persisting this
-- table needs an ADR + write-budget review first; the transition-only write
-- pattern (≈7k rows/d ESTIMATE at ~5%/hr) is what keeps a future binding
-- under the D1 100k rows/d cap with the 80% guard in
-- packages/providers/src/dynamic/budget.ts.
CREATE TABLE IF NOT EXISTS reliability_transitions (
  site_id TEXT NOT NULL,
  from_status TEXT NOT NULL,
  to_status TEXT NOT NULL,
  observed_at TEXT NOT NULL,
  PRIMARY KEY (site_id, observed_at)
);

CREATE INDEX IF NOT EXISTS idx_reliability_transitions_site_time
  ON reliability_transitions (site_id, observed_at);
