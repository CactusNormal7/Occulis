import { Fragment, type ReactNode } from "react";
import { Card, CodeBlock, Note, Prose, useMessages } from "@occulis/ui";
import { markdownBlocks, type Block, type Inline } from "./catalog.js";
import { ART_DIRECTION, CONVENTIONS } from "./sources.js";

/**
 * Les conventions : celles que lit l'agent de Claude Design (`.design-sync/conventions.md`),
 * et la direction artistique du design doc (section 8.1), d'où viennent les décisions.
 */
export function Conventions() {
  const m = useMessages().admin.design.conventions;
  return (
    <>
      <Card title={m.agent} action={<code>.design-sync/conventions.md</code>}>
        <Markdown source={CONVENTIONS} />
      </Card>
      <Card title={m.direction} action={<code>docs/design.md · 8.1</code>}>
        <Note>{m.sourceNote}</Note>
        <Markdown source={ART_DIRECTION} />
      </Card>
    </>
  );
}

function Markdown({ source }: { source: string }) {
  return <Prose>{markdownBlocks(source).map((block, index) => <BlockView key={index} block={block} />)}</Prose>;
}

function BlockView({ block }: { block: Block }) {
  switch (block.kind) {
    case "heading": {
      const content = <Spans spans={block.text} />;
      if (block.level <= 1) return <h1>{content}</h1>;
      if (block.level === 2) return <h2>{content}</h2>;
      return <h3>{content}</h3>;
    }
    case "paragraph":
      return (
        <p>
          <Spans spans={block.text} />
        </p>
      );
    case "list": {
      const items = block.items.map((item, index) => (
        <li key={index}>
          <Spans spans={item} />
        </li>
      ));
      return block.ordered ? <ol>{items}</ol> : <ul>{items}</ul>;
    }
    case "code":
      return <CodeBlock label={block.language.length > 0 ? block.language : undefined}>{block.text}</CodeBlock>;
  }
}

/** Un lien vers le web s'ouvre ; un lien vers un fichier du dépôt n'a pas d'adresse ici, il reste un nom. */
function Spans({ spans }: { spans: readonly Inline[] }): ReactNode {
  return spans.map((span, index) => {
    switch (span.kind) {
      case "text":
        return <Fragment key={index}>{span.text}</Fragment>;
      case "code":
        return <code key={index}>{span.text}</code>;
      case "strong":
        return <strong key={index}>{span.text}</strong>;
      case "em":
        return <em key={index}>{span.text}</em>;
      case "link":
        return /^https?:\/\//.test(span.href) ? (
          <a key={index} href={span.href} target="_blank" rel="noreferrer">
            {span.text}
          </a>
        ) : (
          <code key={index}>{span.text}</code>
        );
    }
  });
}
