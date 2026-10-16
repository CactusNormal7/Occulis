import { Component, useEffect, useState, type ReactNode } from "react";
import { AsideLayout, Badge, Button, Card, CodeBlock, EmptyState, NavList, Note, Prose, Stage, useMessages } from "@occulis/ui";
import { routeHash } from "../model.js";
import { COMPONENTS, type ComponentEntry, type Story } from "./sources.js";

/**
 * Le catalogue des composants : la navigation par catégorie, et pour le composant choisi son
 * commentaire, chacun de ses aperçus **monté en vrai** avec son code, et ses props — tels que
 * la synchronisation les envoie à Claude Design.
 */
export function Components({ selected }: { selected: string | null }) {
  const m = useMessages().admin.design.components;
  const current = COMPONENTS.find((entry) => entry.name === selected) ?? COMPONENTS[0];
  const categories = [...new Set(COMPONENTS.map((entry) => entry.category))];

  return (
    <AsideLayout
      aside={
        <Card title={m.count(COMPONENTS.length)}>
          <NavList
            sections={categories.map((category) => ({
              label: category,
              items: COMPONENTS.filter((entry) => entry.category === category).map((entry) => ({
                href: routeHash({ view: "design", page: "components", component: entry.name }),
                label: entry.name,
                current: entry.name === current?.name,
              })),
            }))}
          />
        </Card>
      }
    >
      {current === undefined ? <EmptyState>{m.noStory}</EmptyState> : <ComponentPage key={current.name} entry={current} />}
    </AsideLayout>
  );
}

function ComponentPage({ entry }: { entry: ComponentEntry }) {
  const m = useMessages().admin.design.components;
  const overlay = entry.category === "Overlays";
  return (
    <>
      <Card title={entry.name} action={<Badge tone="dim">{entry.category}</Badge>}>
        <Prose>
          {entry.doc.length === 0 ? (
            <p>{m.noDoc}</p>
          ) : (
            entry.doc.split(/\n\s*\n/).map((paragraph, index) => <p key={index}>{paragraph.replace(/\n/g, " ")}</p>)
          )}
        </Prose>
        {entry.file !== undefined && <Note>{m.source(`packages/ui/src/components/${entry.file}`)}</Note>}
        {overlay && <Note>{m.overlayHint}</Note>}
      </Card>
      {entry.stories.length === 0 ? (
        <EmptyState>{m.noStory}</EmptyState>
      ) : (
        entry.stories.map((story) => <StoryStage key={story.name} story={story} overlay={overlay} />)
      )}
      {entry.props !== undefined && (
        <Card title={m.props}>
          <CodeBlock label={entry.file}>{entry.props}</CodeBlock>
        </Card>
      )}
    </>
  );
}

function StoryStage({ story, overlay }: { story: Story; overlay: boolean }) {
  const m = useMessages().admin.design.components;
  const [code, setCode] = useState(false);
  const [open, setOpen] = useState(false);
  const Render = story.Render;
  return (
    <Stage
      title={story.name}
      actions={
        <>
          {overlay && (
            <Button size="sm" icon="play" onClick={() => setOpen(true)}>
              {m.open}
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => setCode((value) => !value)}>
            {code ? m.hideCode : m.code}
          </Button>
        </>
      }
    >
      <Contained>
        {overlay ? (
          open && (
            <OverlayHost onClose={() => setOpen(false)}>
              <Render />
            </OverlayHost>
          )
        ) : (
          <Render />
        )}
      </Contained>
      {code && <CodeBlock label="tsx">{story.code}</CodeBlock>}
    </Stage>
  );
}

/**
 * Une fenêtre modale d'aperçu ne sait pas se fermer (son `onClose` ne fait rien) : Échap ou
 * un clic sur son voile la démontent ici, de l'extérieur.
 */
function OverlayHost({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);
  return (
    <div
      onClickCapture={(event) => {
        if (event.target instanceof HTMLDialogElement) onClose();
      }}
    >
      {children}
    </div>
  );
}

/** Un aperçu qui lève une erreur ne doit pas emporter la page : il est remplacé par son message. */
class Contained extends Component<{ children: ReactNode }, { error: string | null }> {
  override state = { error: null as string | null };

  static getDerivedStateFromError(error: unknown) {
    return { error: error instanceof Error ? error.message : String(error) };
  }

  override render() {
    return this.state.error === null ? this.props.children : <EmptyState>{this.state.error}</EmptyState>;
  }
}
