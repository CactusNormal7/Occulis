/**
 * La charte d'Occulis en composants Vue. Importer aussi `@occulis/ui/styles.css`, et
 * envelopper l'interface dans `UiRoot` — sans lui, les composants héritent de la police
 * et du fond de la page hôte.
 *
 * Un composant par fichier `.vue`, exporté sous son nom ; les formes de données qu'ils
 * reçoivent sont dans `types.ts`, la langue et les messages éphémères dans `composables/`.
 */
export * from "./tokens.js";
export * from "./types.js";
export { revealWindow } from "./window-reveal.js";
export { ICON_NAMES, type IconName } from "./icons.js";
export { initials } from "./initials.js";
export { provideLocale, useLocale, useMessages } from "./composables/locale.js";
export { useToast, type Notify } from "./composables/toast.js";

// Fondations et langue
export { default as UiRoot } from "./components/UiRoot.vue";
export { default as Icon } from "./components/Icon.vue";
export { default as LocaleProvider } from "./components/LocaleProvider.vue";
export { default as LocaleSwitch } from "./components/LocaleSwitch.vue";

// Actions
export { default as Button } from "./components/Button.vue";
export { default as IconButton } from "./components/IconButton.vue";
export { default as QuickBar } from "./components/QuickBar.vue";

// Formulaires
export { default as TextField } from "./components/TextField.vue";
export { default as PasswordField } from "./components/PasswordField.vue";
export { default as SelectField } from "./components/SelectField.vue";
export { default as SearchField } from "./components/SearchField.vue";
export { default as InlineEdit } from "./components/InlineEdit.vue";
export { default as Segmented } from "./components/Segmented.vue";
export { default as ChipGroup } from "./components/ChipGroup.vue";

// Parcours de compte
export { default as FormPanel } from "./components/FormPanel.vue";
export { default as FormMessage } from "./components/FormMessage.vue";
export { default as Divider } from "./components/Divider.vue";
export { default as ProviderButton } from "./components/ProviderButton.vue";

// Réglages
export { default as SettingList } from "./components/SettingList.vue";
export { default as SettingRow } from "./components/SettingRow.vue";
export { default as SettingEditor } from "./components/SettingEditor.vue";

// États
export { default as Badge } from "./components/Badge.vue";
export { default as BadgeRow } from "./components/BadgeRow.vue";
export { default as Banner } from "./components/Banner.vue";
export { default as EmptyState } from "./components/EmptyState.vue";
export { default as WorkInProgress } from "./components/WorkInProgress.vue";
export { default as Skeleton } from "./components/Skeleton.vue";
export { default as SkeletonScreen } from "./components/SkeletonScreen.vue";
export { default as ToastProvider } from "./components/ToastProvider.vue";
export { default as ToastStack } from "./components/ToastStack.vue";
export { default as ProgressBar } from "./components/ProgressBar.vue";

// Joueurs
export { default as TileAvatar } from "./components/TileAvatar.vue";
export { default as Person } from "./components/Person.vue";
export { default as Versus } from "./components/Versus.vue";
export { default as PlayerPlate } from "./components/PlayerPlate.vue";
export { default as Reveal } from "./components/Reveal.vue";

// Choix et temps
export { default as ChoiceList } from "./components/ChoiceList.vue";
export { default as ChoiceRow } from "./components/ChoiceRow.vue";
export { default as CountdownRing } from "./components/CountdownRing.vue";

// Mise en page
export { default as Card } from "./components/Card.vue";
export { default as CardGrid } from "./components/CardGrid.vue";
export { default as CardColumn } from "./components/CardColumn.vue";
export { default as PageHead } from "./components/PageHead.vue";
export { default as BackLink } from "./components/BackLink.vue";
export { default as Hero } from "./components/Hero.vue";
export { default as Toolbar } from "./components/Toolbar.vue";
export { default as ToolbarText } from "./components/ToolbarText.vue";
export { default as TopBar } from "./components/TopBar.vue";
export { default as Wordmark } from "./components/Wordmark.vue";
export { default as Note } from "./components/Note.vue";

// Données
export { default as StatTile } from "./components/StatTile.vue";
export { default as StatTileGrid } from "./components/StatTileGrid.vue";
export { default as Stat } from "./components/Stat.vue";
export { default as StatGrid } from "./components/StatGrid.vue";
export { default as FactStrip } from "./components/FactStrip.vue";
export { default as DefinitionList } from "./components/DefinitionList.vue";
export { default as Table } from "./components/Table.vue";
export { default as Pager } from "./components/Pager.vue";
export { default as List } from "./components/List.vue";
export { default as ListRow } from "./components/ListRow.vue";
export { default as MoveList } from "./components/MoveList.vue";

// Fenêtres et messages
export { default as Dialog } from "./components/Dialog.vue";
export { default as MessageThread } from "./components/MessageThread.vue";
export { default as MessageComposer } from "./components/MessageComposer.vue";

// Vitrine de la charte (le design system du back-office)
export { default as CodeBlock } from "./components/CodeBlock.vue";
export { default as Swatch } from "./components/Swatch.vue";
export { default as SwatchGrid } from "./components/SwatchGrid.vue";
export { default as Specimen } from "./components/Specimen.vue";
export { default as Stage } from "./components/Stage.vue";
export { default as Prose } from "./components/Prose.vue";
export { default as NavList } from "./components/NavList.vue";
export { default as AsideLayout } from "./components/AsideLayout.vue";
