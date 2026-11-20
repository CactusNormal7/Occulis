import { h, type Component } from "vue";
import { renderToString } from "vue/server-renderer";
import { describe, expect, it } from "vitest";
import {
  AsideLayout,
  Badge,
  Banner,
  Button,
  Card,
  ChipGroup,
  ChoiceList,
  ChoiceRow,
  CodeBlock,
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
  Prose,
  ProviderButton,
  Reveal,
  Segmented,
  SettingEditor,
  SettingList,
  SettingRow,
  Skeleton,
  SkeletonScreen,
  Specimen,
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
  WorkInProgress,
  initials,
} from "./index.js";

/**
 * Un rendu serveur de chaque composant : il ne dit rien du visuel — c'est le rôle des
 * aperçus vérifiés de `.design-sync/` — mais il garantit qu'aucun ne lève et que chacun
 * porte les classes et attributs dont la feuille de style dépend.
 */
type Slots = Record<string, () => unknown>;

function html(component: Component, props: Record<string, unknown> = {}, slots: Slots = {}) {
  return renderToString(h(component, props, slots));
}

/** Un contenu d'emplacement : `text("…")` rend le texte, `node(Badge, …)` un composant. */
const text = (value: string) => () => value;
const node =
  (component: Component | string, props: Record<string, unknown> = {}, slots?: Slots | string) =>
  () =>
    h(component, props, slots);

describe("composants", () => {
  it("rend chaque icône au trait, sans couleur", async () => {
    for (const name of ICON_NAMES) {
      const markup = await html(Icon, { name });
      expect(markup).toContain('class="occ-icon"');
      expect(markup).not.toMatch(/fill="#|stroke="#/);
    }
  });

  it("donne la raison d'un bouton à icône inactif en infobulle", async () => {
    const markup = await html(IconButton, {
      icon: "trash",
      label: "Supprimer",
      disabledReason: "Votre propre compte.",
    });
    expect(markup).toContain('data-tip="Votre propre compte."');
    expect(markup).toContain("disabled");
    expect(markup).toContain('aria-label="Supprimer"');
  });

  it("tire les initiales d'un nom", async () => {
    expect(initials("cactus")).toBe("CA");
    expect(initials("-x")).toBe("X");
    expect(initials("--")).toBe("?");
    expect(await html(TileAvatar, { name: "anne", camp: "A" })).toContain("occ-tile-avatar--A");
  });

  it("marque l'onglet courant et l'option choisie", async () => {
    const bar = await html(TopBar, {
      section: "back-office",
      tabs: [{ href: "#/", label: "Vue", current: true }],
    });
    expect(bar).toContain('aria-current="page"');

    const segmented = await html(Segmented, {
      options: [
        { value: "a", label: "A", camp: "A" },
        { value: "b", label: "B" },
      ],
      modelValue: "a",
    });
    expect(segmented).toContain("occ-segmented__option--A");
    expect(segmented).toContain('aria-current="true"');
  });

  it("cède la place à l'état vide quand une table n'a pas de ligne", async () => {
    expect(await html(Table, { columns: ["a"], rowCount: 0, empty: "Aucune partie." })).toContain(
      "Aucune partie.",
    );
    const pager = {
      offset: 25,
      shown: 25,
      total: 132,
      pageSize: 25,
      hrefFor: (o: number) => `#${o}`,
    };
    expect(await html(Pager, pager)).toContain("26–50 of 132");
  });

  it("parle la langue que lui fixe UiRoot", async () => {
    const pager = node(Pager, {
      offset: 25,
      shown: 25,
      total: 132,
      pageSize: 25,
      hrefFor: (o: number) => `#${o}`,
    });
    const french = await html(UiRoot, { locale: "fr" }, { default: pager });
    expect(french).toContain("26–50 sur 132");
    expect(french).toContain('lang="fr"');
    expect(await html(UiRoot, {}, { default: pager })).toContain("26–50 of 132");
  });

  it("signale un élément en chantier sans toucher à son contenu", async () => {
    const markup = await html(
      UiRoot,
      {},
      {
        default: node(
          WorkInProgress,
          { note: "données factices" },
          { default: node("p", {}, "contenu") },
        ),
      },
    );
    expect(markup).toContain('class="occ-wip" title="données factices"');
    expect(markup).toContain("WIP");
    expect(markup).toContain("<p>contenu</p>");
  });

  it("rend les autres briques sans lever", async () => {
    const parts = [
      node(Button, { variant: "danger", icon: "trash" }, { default: text("Supprimer") }),
      node(Badge, { tone: "refused" }, { default: text("suspendu") }),
      node(Person, { name: "anne", detail: "anne@occulis.test", href: "#/users/1" }),
      node(
        Card,
        { title: "Profil" },
        { default: text("contenu"), action: node("a", { href: "#" }, "tout voir") },
      ),
      node(StatTile, { value: 12, label: "parties", animate: false }),
      node(Hero, { title: "anne" }, { meta: node("span", {}, "anne@occulis.test") }),
      node(Banner, {}, { default: text("suspendu définitivement") }),
      node(FactStrip, { facts: [{ label: "début", value: "2026-10-02" }] }),
      node(InlineEdit, { label: "pseudo", action: "Renommer", onSubmit: () => undefined }),
      node(ChipGroup, { options: [{ value: "1", label: "1 jour" }], modelValue: "1" }),
      node(MoveList, { entries: [{ number: "1", seat: "A", text: "1,1 → 2,1" }], pinned: 0 }),
      node(Dialog, {
        open: false,
        title: "Suspendre",
        confirmLabel: "Suspendre",
        onConfirm: () => true,
      }),
      node(ToastStack, { messages: [{ id: 1, text: "Compte suspendu.", ok: true }] }),
    ];
    const markup = await html(UiRoot, {}, { default: () => parts.map((part) => part()) });
    expect(markup).toContain("occ-root");
  });

  it("rattache l'aide et l'erreur d'un champ par aria-describedby", async () => {
    const markup = await html(TextField, {
      label: "Adresse",
      name: "email",
      hint: "Celle du compte.",
      error: "Adresse invalide.",
    });
    expect(markup).toContain('aria-invalid="true"');
    expect(markup).toContain("occ-field--error");
    const described = markup.match(/aria-describedby="([^"]+)"/)?.[1]?.split(" ") ?? [];
    expect(described).toHaveLength(2);
    for (const id of described) expect(markup).toContain(`id="${id}"`);
  });

  it("garde le champ de mot de passe reconnaissable par les gestionnaires", async () => {
    const markup = await html(PasswordField, {
      label: "Mot de passe",
      name: "password",
      autocomplete: "new-password",
      minlength: 10,
    });
    expect(markup).toContain('type="password"');
    expect(markup).toContain('autocomplete="new-password"');
    expect(markup).toContain('minlength="10"');
    // Le bouton d'affichage ne doit jamais soumettre le formulaire.
    expect(markup).toContain('type="button"');
    expect(markup).toContain('aria-pressed="false"');
  });

  it("rend les briques des parcours de compte", async () => {
    const panel = await html(
      FormPanel,
      { title: "Connexion", lead: "Bon retour." },
      {
        default: () => [
          h(ProviderButton, { provider: "google" }),
          h(Divider, null, { default: text("ou") }),
          h(FormMessage, { tone: "error" }, { default: text("Identifiants invalides.") }),
        ],
        footer: node("a", { href: "/sign-up" }, "Créer un compte"),
      },
    );
    expect(panel).toContain("occ-form-panel");
    expect(panel).toContain("Continue with Google");
    expect(panel).toContain('role="separator"');
    expect(panel).toContain('role="alert"');
    expect(await html(FormMessage, { tone: "success" }, { default: text("Fait.") })).toContain(
      'role="status"',
    );
  });

  it("dessine le logo Google sans couleur propre", async () => {
    const markup = await html(ProviderButton, { provider: "google" });
    expect(markup).toContain('fill="currentColor"');
    expect(markup).not.toMatch(/fill="(#|rgb)/);
  });

  it("montre un réglage en lecture, puis son éditeur à la place de la valeur", async () => {
    const reading = await html(
      SettingList,
      {},
      {
        default: node(SettingRow, {
          label: "Pseudo",
          value: "anne",
          description: "Visible par vos adversaires.",
          onEdit: () => undefined,
        }),
      },
    );
    expect(reading).toContain("occ-settings");
    expect(reading).toContain("anne");
    expect(reading).toContain("Edit");

    const editor = node(
      SettingEditor,
      { submitLabel: "Enregistrer", error: "Ce pseudo est déjà pris." },
      { default: node("input", { name: "handle", value: "anne" }) },
    );
    const editing = await html(
      SettingRow,
      { label: "Pseudo", value: "anne", onEdit: () => undefined, editing: true },
      { default: editor },
    );
    expect(editing).toContain("occ-setting--editing");
    expect(editing).toContain("<form");
    expect(editing).toContain('role="alert"');
    expect(editing).toContain("Cancel");
    // Le bouton d'édition disparaît tant que l'éditeur est ouvert.
    expect(editing).not.toMatch(/>\s*Edit\s*</);
  });
});

describe("préparation d'une partie", () => {
  it("dessine un compte à rebours proportionnel, urgent sous cinq secondes", async () => {
    const calm = await html(
      CountdownRing,
      { totalMs: 10_000, remainingMs: 6_000, label: "Temps restant" },
      { default: text("6") },
    );
    expect(calm).toContain('role="timer"');
    expect(calm).not.toContain("occ-countdown--urgent");
    expect(
      await html(CountdownRing, { totalMs: 10_000, remainingMs: 4_000, label: "t" }),
    ).toContain("occ-countdown--urgent");
  });

  it("annonce deux joueurs, chacun dans la couleur de son camp", async () => {
    const reveal = await html(
      Reveal,
      { versus: "vs" },
      {
        self: node(
          PlayerPlate,
          { name: "anne", camp: "A", tag: "You", lines: ["1200 Elo"] },
          { badges: node(Badge, {}, { default: text("First blood") }) },
        ),
        opponent: node(PlayerPlate, { name: "boris", camp: "B", align: "end" }),
      },
    );
    expect(reveal).toContain("occ-plate--A");
    expect(reveal).toContain("occ-plate--B occ-plate--end");
    expect(reveal).toContain("First blood");
    expect(await html(Reveal, { versus: "vs", compact: true })).toContain("occ-reveal--compact");
  });

  it("rend une ligne de choix comme un bouton marqué quand elle est choisie", async () => {
    const list = await html(
      ChoiceList,
      { label: "team" },
      {
        default: () => [
          h(ChoiceRow, { selected: true, onSelect: () => undefined }, { default: text("Scout") }),
          h(ChoiceRow, { muted: true }, { default: text("Pawn") }),
        ],
      },
    );
    expect(list).toContain('aria-pressed="true"');
    expect(list).toContain("occ-choice--muted");
  });

  it("laisse une fenêtre sans croix quand elle attend une réponse explicite", async () => {
    const dialog = await html(Dialog, {
      open: true,
      title: "Match found",
      confirmLabel: "Accept",
      cancelLabel: "Decline",
      dismissible: false,
      onConfirm: () => true,
    });
    expect(dialog).toContain("Decline");
    expect(dialog).not.toContain("occ-icon-button");
    // Le titre nomme la fenêtre : un lecteur d'écran l'annonce, `getByRole("dialog", { name })` la trouve.
    const titleId = /<h2 id="([^"]+)"/.exec(dialog)?.[1];
    expect(titleId).toBeDefined();
    expect(dialog).toContain(`aria-labelledby="${titleId}"`);
  });

  it("aligne ses propres messages à part dans un fil, et échappe leur texte", async () => {
    const thread = await html(MessageThread, {
      messages: [
        { id: "1", body: "<b>salut</b>", mine: false, meta: "10:02" },
        { id: "2", body: "bonjour", mine: true },
      ],
    });
    expect(thread).toContain('role="log"');
    expect(thread.match(/occ-thread__message--mine/g)).toHaveLength(1);
    expect(thread).toContain("&lt;b&gt;salut");
    expect(await html(MessageThread, { messages: [], empty: "Rien encore." })).toContain(
      "Rien encore.",
    );
    expect(await html(MessageComposer, { onSend: async () => true, maxlength: 500 })).toContain(
      'maxlength="500"',
    );
  });

  it("annonce un chargement sans texte visible, encadré à la demande", async () => {
    const lines = await html(Skeleton, { lines: 4 });
    expect(lines).toContain('aria-busy="true"');
    expect(lines.match(/occ-skeleton__line/g)).toHaveLength(4);
    expect(lines).not.toContain("occ-skeleton--card");
    expect(await html(Skeleton, { card: true })).toContain("occ-skeleton--card");
  });

  it("annonce un écran à venir d'une seule voix, dans la forme demandée", async () => {
    const screen = await html(SkeletonScreen, { layout: "hero" });
    expect(screen.match(/role="status"/g)).toHaveLength(1);
    expect(screen).toContain("occ-skeleton__tile");
    expect(await html(SkeletonScreen)).toContain("occ-skeleton__title");
    expect(await html(SkeletonScreen, { layout: "detail" })).toContain("occ-skeleton__area");
  });

  it("montre la charte : code échappé, échantillon modifiable ou non, lien courant marqué", async () => {
    const code = await html(CodeBlock, { label: "vue", code: "<UiRoot />" });
    expect(code).toContain("&lt;UiRoot /&gt;");
    expect(code).toContain('class="occ-label">vue');

    const swatch = { name: "camp.A", color: "var(--occ-camp-a)", value: "camp A" };
    expect(await html(Swatch, swatch)).not.toContain("<input");
    const editable = await html(Swatch, { ...swatch, edited: true, onChange: () => undefined });
    expect(editable).toContain('type="color"');
    expect(editable).toContain('aria-label="camp.A"');
    expect(editable).toContain("occ-swatch--edited");

    const nav = await html(NavList, {
      sections: [
        {
          label: "Actions",
          items: [
            { href: "#a", label: "Button", current: true },
            { href: "#b", label: "Icon" },
          ],
        },
      ],
    });
    expect(nav).toContain('href="#a" aria-current="page"');
    expect(nav).not.toContain('href="#b" aria-current');

    const specimen = node(
      Specimen,
      { name: "--occ-space-1", value: "4px" },
      { default: node("span") },
    );
    const page = await html(
      AsideLayout,
      {},
      {
        aside: node("span", {}, "nav"),
        default: node(
          Stage,
          { title: "Variants" },
          {
            actions: node("span", {}, "code"),
            default: node(Prose, {}, { default: node(SwatchGrid, {}, { default: specimen }) }),
          },
        ),
      },
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
