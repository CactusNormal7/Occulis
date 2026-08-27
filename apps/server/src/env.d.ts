interface Env {
  readonly DB: D1Database;
  readonly MATCH: DurableObjectNamespace;
  readonly ASSETS: Fetcher;
}
