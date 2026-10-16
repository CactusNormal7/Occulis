import { CodeBlock } from "@occulis/ui";

export const Snippet = () => (
  <CodeBlock label="tsx">{`<UiRoot fullPage>
  <main className="occ-page">
    <Card title="Matches">…</Card>
  </main>
</UiRoot>`}</CodeBlock>
);

export const Bare = () => <CodeBlock>{"pnpm --filter @occulis/ui build"}</CodeBlock>;
