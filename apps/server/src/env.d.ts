interface Env {
  readonly DB: D1Database;
  readonly MATCH: DurableObjectNamespace;
  readonly QUEUE: DurableObjectNamespace;
  readonly ASSETS: Fetcher;
}
