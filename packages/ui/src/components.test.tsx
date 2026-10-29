import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  AsideLayout,
  Badge,
  Banner,
  Button,
  Card,
  CodeBlock,
  ChipGroup,
  ChoiceList,
  ChoiceRow,
  CountdownRing,
  Dialog,
  Divider,
  FactStrip,
  FormMessage,
  FormPanel,
  Hero,
  ICON_NAMES,
  Icon,
  IconButton,
  InlineEdit,
  MessageComposer,
  MessageThread,
  MoveList,
  NavList,
  Pager,
  PasswordField,
  Person,
  PlayerPlate,
  ProviderButton,
  Prose,
  Reveal,
  Segmented,
  Skeleton,
  SkeletonScreen,
  SettingEditor,
  SettingList,
  SettingRow,
  Specimen,
  WorkInProgress,
  Stage,
  StatTile,
  Swatch,
  SwatchGrid,
  Table,
  TextField,
  TileAvatar,
  ToastStack,
  TopBar,
  UiRoot,
  initials,
} from "./index.js";

/**
 * Un rendu serveur de chaque composant : il ne dit rien du visuel — c'est le rôle des
 * aperçus vérifiés de `.design-sync/` — mais il garantit qu'aucun ne lève et que chacun
 * porte les classes et attributs dont la feuille de style dépend.
 */
const html = (element: React.ReactElement) => renderToStaticMarkup(element);

describe("composants", () => {
  it("rend chaque icône au trait, sans couleur", () => {
    for (const name of ICON_NAMES) {
      const markup = html(<Icon name={name} />);
      expect(markup).toContain('class="occ-icon"');
      expect(markup).not.toMatch(/fill="#|stroke="#/);
    }
  });

  it("donne la raison d'un bouton à icône inactif en infobulle", () => {
    const markup = html(
      <IconButton icon="trash" label="Supprimer" disabledReason="Votre propre compte." />,
    );
    expect(markup).toContain('data-tip="Votre propre compte."');
    expect(markup).toContain("disabled");
    expect(markup).toContain('aria-label="Supprimer"');
  });

  it("tire les initiales d'un nom", () => {
    expect(initials("cactus")).toBe("CA");
    expect(initials("-x")).toBe("X");
    expect(initials("--")).toBe("?");
    expect(html(<TileAvatar name="anne" camp="A" />)).toContain("occ-tile-avatar--A");
  });

  it("marque l'onglet courant et l'option choisie", () => {
    expect(
      html(<TopBar section="back-office" tabs={[{ href: "#/", label: "Vue", current: true }]} />),
    ).toContain('aria-current="page"');
    const segmented = html(
      <Segmented
        options={[
          { value: "a", label: "A", camp: "A" },
          { value: "b", label: "B" },
        ]}
        value="a"
      />,
    );
    expect(segmented).toContain("occ-segmented__option--A");
    expect(segmented).toContain('aria-current="true"');
  });

  it("cède la place à l'état vide quand une table n'a pas de ligne", () => {
    expect(html(<Table columns={["a"]} rowCount={0} empty="Aucune partie." />)).toContain(
      "Aucune partie.",
    );
    expect(
      html(<Pager offset={25} shown={25} total={132} pageSize={25} hrefFor={(o) => `#${o}`} />),
    ).toContain("26–50 of 132");
  });

  it("parle la langue que lui fixe UiRoot", () => {
    const pager = (
      <Pager offset={25} shown={25} total={132} pageSize={25} hrefFor={(o) => `#${o}`} />
    );
    expect(html(<UiRoot locale="fr">{pager}</UiRoot>)).toContain("26–50 sur 132");
    expect(html(<UiRoot locale="fr">{pager}</UiRoot>)).toContain('lang="fr"');
    expect(html(<UiRoot>{pager}</UiRoot>)).toContain("26–50 of 132");
  });

  it("signale un élément en chantier sans toucher à son contenu", () => {
    const html = renderToStaticMarkup(
      <UiRoot>
        <WorkInProgress note="données factices">
          <p>contenu</p>
        </WorkInProgress>
      </UiRoot>,
    );
    expect(html).toContain('class="occ-wip" title="données factices"');
    expect(html).toContain("WIP");
    expect(html).toContain("<p>contenu</p>");
  });

  it("rend les autres briques sans lever", () => {
    const tree = (
      <UiRoot>
        <Button variant="danger" icon="trash">
          Supprimer
        </Button>
        <Badge tone="refused">suspendu</Badge>
        <Person name="anne" detail="anne@occulis.test" href="#/users/1" />
        <Card title="Profil" action={<a href="#">tout voir</a>}>
          contenu
        </Card>
        <StatTile value={12} label="parties" animate={false} />
        <Hero title="anne" meta={["anne@occulis.test"]} />
        <Banner>suspendu définitivement</Banner>
        <FactStrip facts={[{ label: "début", value: "2026-10-02" }]} />
        <InlineEdit label="pseudo" action="Renommer" onSubmit={() => undefined} />
        <ChipGroup
          options={[{ value: "1", label: "1 jour" }]}
          value="1"
          onChange={() => undefined}
        />
        <MoveList entries={[{ number: "1", seat: "A", text: "1,1 → 2,1" }]} pinned={0} />
        <Dialog
          open={false}
          title="Suspendre"
          confirmLabel="Suspendre"
          onConfirm={() => true}
          onClose={() => undefined}
        />
        <ToastStack messages={[{ id: 1, text: "Compte suspendu.", ok: true }]} />
      </UiRoot>
    );
    expect(html(tree)).toContain("occ-root");
  });

  it("rattache l'aide et l'erreur d'un champ par aria-describedby", () => {
    const markup = html(
      <TextField label="Adresse" name="email" hint="Celle du compte." error="Adresse invalide." />,
    );
    expect(markup).toContain('aria-invalid="true"');
    expect(markup).toContain("occ-field--error");
    const described = markup.match(/aria-describedby="([^"]+)"/)?.[1]?.split(" ") ?? [];
    expect(described).toHaveLength(2);
    for (const id of described) expect(markup).toContain(`id="${id}"`);
  });

  it("garde le champ de mot de passe reconnaissable par les gestionnaires", () => {
    const markup = html(
      <PasswordField
        label="Mot de passe"
        name="password"
        autoComplete="new-password"
        minLength={10}
      />,
    );
    expect(markup).toContain('type="password"');
    expect(markup).toContain('autoComplete="new-password"');
    expect(markup).toContain('minLength="10"');
    // Le bouton d'affichage ne doit jamais soumettre le formulaire.
    expect(markup).toContain('type="button"');
    expect(markup).toContain('aria-pressed="false"');
  });

  it("rend les briques des parcours de compte", () => {
    const panel = html(
      <FormPanel
        title="Connexion"
        lead="Bon retour."
        footer={<a href="/sign-up">Créer un compte</a>}
      >
        <ProviderButton provider="google" />
        <Divider>ou</Divider>
        <FormMessage tone="error">Identifiants invalides.</FormMessage>
      </FormPanel>,
    );
    expect(panel).toContain("occ-form-panel");
    expect(panel).toContain("Continue with Google");
    expect(panel).toContain('role="separator"');
    expect(panel).toContain('role="alert"');
    expect(html(<FormMessage tone="success">Fait.</FormMessage>)).toContain('role="status"');
  });

  it("dessine le logo Google sans couleur propre", () => {
    const markup = html(<ProviderButton provider="google" />);
    expect(markup).toContain('fill="currentColor"');
    expect(markup).not.toMatch(/fill="(#|rgb)/);
  });

  it("montre un réglage en lecture, puis son éditeur à la place de la valeur", () => {
    const reading = html(
      <SettingList>
        <SettingRow
          label="Pseudo"
          value="anne"
          description="Visible par vos adversaires."
          onEdit={() => undefined}
        />
      </SettingList>,
    );
    expect(reading).toContain("occ-settings");
    expect(reading).toContain("anne");
    expect(reading).toContain("Edit");

    const editing = html(
      <SettingRow label="Pseudo" value="anne" onEdit={() => undefined} editing>
        <SettingEditor
          submitLabel="Enregistrer"
          onSubmit={() => undefined}
          onCancel={() => undefined}
          error="Ce pseudo est déjà pris."
        >
          <input name="handle" defaultValue="anne" />
        </SettingEditor>
      </SettingRow>,
    );
    expect(editing).toContain("occ-setting--editing");
    expect(editing).toContain("<form");
    expect(editing).toContain('role="alert"');
    expect(editing).toContain("Cancel");
    // Le bouton d'édition disparaît tant que l'éditeur est ouvert.
    expect(editing).not.toContain(">Edit<");
  });
});

describe("préparation d'une partie", () => {
  it("dessine un compte à rebours proportionnel, urgent sous cinq secondes", () => {
    const calm = html(
      <CountdownRing totalMs={10_000} remainingMs={6_000} label="Temps restant">
        6
      </CountdownRing>,
    );
    expect(calm).toContain('role="timer"');
    expect(calm).not.toContain("occ-countdown--urgent");
    expect(html(<CountdownRing totalMs={10_000} remainingMs={4_000} label="t" />)).toContain(
      "occ-countdown--urgent",
    );
  });

  it("annonce deux joueurs, chacun dans la couleur de son camp", () => {
    const reveal = html(
      <Reveal
        versus="vs"
        self={
          <PlayerPlate
            name="anne"
            camp="A"
            tag="You"
            lines={["1200 Elo"]}
            badges={<Badge>First blood</Badge>}
          />
        }
        opponent={<PlayerPlate name="boris" camp="B" align="end" />}
      />,
    );
    expect(reveal).toContain("occ-plate--A");
    expect(reveal).toContain("occ-plate--B occ-plate--end");
    expect(reveal).toContain("First blood");
    expect(html(<Reveal versus="vs" self={null} opponent={null} compact />)).toContain(
      "occ-reveal--compact",
    );
  });

  it("rend une ligne de choix comme un bouton marqué quand elle est choisie", () => {
    const list = html(
      <ChoiceList label="team">
        <ChoiceRow selected onSelect={() => undefined}>
          <strong>Scout</strong>
        </ChoiceRow>
        <ChoiceRow muted>
          <strong>Pawn</strong>
        </ChoiceRow>
      </ChoiceList>,
    );
    expect(list).toContain('aria-pressed="true"');
    expect(list).toContain("occ-choice--muted");
  });

  it("laisse une fenêtre sans croix quand elle attend une réponse explicite", () => {
    const dialog = html(
      <Dialog
        open
        title="Match found"
        confirmLabel="Accept"
        cancelLabel="Decline"
        dismissible={false}
        onConfirm={() => true}
        onClose={() => undefined}
      />,
    );
    expect(dialog).toContain("Decline");
    expect(dialog).not.toContain("occ-icon-button");
    // Le titre nomme la fenêtre : un lecteur d'écran l'annonce, `getByRole("dialog", { name })` la trouve.
    const titleId = /<h2 id="([^"]+)"/.exec(dialog)?.[1];
    expect(titleId).toBeDefined();
    expect(dialog).toContain(`aria-labelledby="${titleId}"`);
  });

  it("aligne ses propres messages à part dans un fil, et échappe leur texte", () => {
    const thread = html(
      <MessageThread
        messages={[
          { id: "1", body: "<b>salut</b>", mine: false, meta: "10:02" },
          { id: "2", body: "bonjour", mine: true },
        ]}
      />,
    );
    expect(thread).toContain('role="log"');
    expect(thread.match(/occ-thread__message--mine/g)).toHaveLength(1);
    expect(thread).toContain("&lt;b&gt;salut");
    expect(html(<MessageThread messages={[]} empty="Rien encore." />)).toContain("Rien encore.");
    expect(html(<MessageComposer onSend={async () => true} maxLength={500} />)).toContain(
      'maxLength="500"',
    );
  });

  it("annonce un chargement sans texte visible, encadré à la demande", () => {
    const lines = html(<Skeleton lines={4} />);
    expect(lines).toContain('aria-busy="true"');
    expect(lines.match(/occ-skeleton__line/g)).toHaveLength(4);
    expect(lines).not.toContain("occ-skeleton--card");
    expect(html(<Skeleton card />)).toContain("occ-skeleton--card");
  });

  it("annonce un écran à venir d'une seule voix, dans la forme demandée", () => {
    const screen = html(<SkeletonScreen layout="hero" />);
    expect(screen.match(/role="status"/g)).toHaveLength(1);
    expect(screen).toContain("occ-skeleton__tile");
    expect(html(<SkeletonScreen />)).toContain("occ-skeleton__title");
    expect(html(<SkeletonScreen layout="detail" />)).toContain("occ-skeleton__area");
  });

  it("montre la charte : code échappé, échantillon modifiable ou non, lien courant marqué", () => {
    const code = html(<CodeBlock label="tsx">{"<UiRoot />"}</CodeBlock>);
    expect(code).toContain("&lt;UiRoot /&gt;");
    expect(code).toContain('class="occ-label">tsx');

    expect(html(<Swatch name="camp.A" color="var(--occ-camp-a)" value="camp A" />)).not.toContain(
      "<input",
    );
    const editable = html(
      <Swatch
        name="camp.A"
        color="var(--occ-camp-a)"
        value="camp A"
        edited
        onChange={() => undefined}
      />,
    );
    expect(editable).toContain('type="color"');
    expect(editable).toContain('aria-label="camp.A"');
    expect(editable).toContain("occ-swatch--edited");

    const nav = html(
      <NavList
        sections={[
          {
            label: "Actions",
            items: [
              { href: "#a", label: "Button", current: true },
              { href: "#b", label: "Icon" },
            ],
          },
        ]}
      />,
    );
    expect(nav).toContain('href="#a" aria-current="page"');
    expect(nav).not.toContain('href="#b" aria-current');

    const page = html(
      <AsideLayout aside={<span>nav</span>}>
        <Stage title="Variants" actions={<span>code</span>}>
          <Prose>
            <SwatchGrid>
              <Specimen name="--occ-space-1" value="4px">
                <span />
              </Specimen>
            </SwatchGrid>
          </Prose>
        </Stage>
      </AsideLayout>,
    );
    for (const name of [
      "occ-aside-layout__aside",
      "occ-stage__actions",
      "occ-prose",
      "occ-swatch-grid",
      "occ-specimen__value",
    ]) {
      expect(page).toContain(name);
    }
  });
});
