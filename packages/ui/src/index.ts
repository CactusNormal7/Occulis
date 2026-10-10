/**
 * La charte d'Occulis en composants React. Importer aussi `@occulis/ui/styles.css`, et
 * envelopper l'interface dans `UiRoot` — sans lui, les composants héritent de la police
 * et du fond de la page hôte.
 */
export * from "./tokens.js";
export { Icon, ICON_NAMES, type IconName, type IconProps } from "./components/Icon.js";
export { UiRoot, type UiRootProps } from "./components/UiRoot.js";
export {
  LocaleProvider,
  LocaleSwitch,
  useLocale,
  useMessages,
  type LocaleSwitchProps,
} from "./components/Locale.js";
export { Button, type ButtonProps } from "./components/Button.js";
export { IconButton, QuickBar, type IconButtonProps, type QuickBarProps } from "./components/IconButton.js";
export { Badge, BadgeRow, type BadgeProps } from "./components/Badge.js";
export { TileAvatar, initials, type TileAvatarProps } from "./components/TileAvatar.js";
export { Person, type PersonProps } from "./components/Person.js";
export { Card, CardGrid, CardColumn, type CardProps } from "./components/Card.js";
export { StatTile, StatTileGrid, Stat, StatGrid, type StatTileProps, type StatProps } from "./components/StatTile.js";
export { TopBar, Wordmark, ProgressBar, type TopBarProps, type TopBarTab, type WordmarkProps } from "./components/TopBar.js";
export { PageHead, BackLink, type PageHeadProps } from "./components/PageHead.js";
export { Hero, type HeroProps } from "./components/Hero.js";
export { Banner, EmptyState, type BannerProps, type EmptyStateProps } from "./components/Banner.js";
export { FactStrip, DefinitionList, type Fact } from "./components/FactStrip.js";
export {
  TextField,
  PasswordField,
  SelectField,
  SearchField,
  InlineEdit,
  type TextFieldProps,
  type PasswordFieldProps,
  type SelectFieldProps,
  type SearchFieldProps,
  type InlineEditProps,
} from "./components/Field.js";
export {
  Segmented,
  ChipGroup,
  type SegmentedProps,
  type SegmentedOption,
  type ChipGroupProps,
} from "./components/Segmented.js";
export { Table, Pager, List, ListRow, type TableProps, type PagerProps, type ListRowProps } from "./components/Table.js";
export { Dialog, Note, type DialogProps } from "./components/Dialog.js";
export { CountdownRing, type CountdownRingProps } from "./components/Countdown.js";
export { PlayerPlate, Reveal, type PlayerPlateProps, type RevealProps } from "./components/PlayerPlate.js";
export { ChoiceList, ChoiceRow, type ChoiceRowProps } from "./components/Choice.js";
export { ToastProvider, ToastStack, useToast, type ToastMessage, type ToastStackProps } from "./components/Toast.js";
export { MoveList, type MoveEntry, type MoveListProps } from "./components/MoveList.js";
export { Toolbar, ToolbarText } from "./components/Toolbar.js";
export { Versus, type VersusProps, type VersusSide } from "./components/Versus.js";
export {
  FormPanel,
  FormMessage,
  Divider,
  ProviderButton,
  type FormPanelProps,
  type FormMessageProps,
  type ProviderButtonProps,
} from "./components/Form.js";
export {
  SettingList,
  SettingRow,
  SettingEditor,
  type SettingRowProps,
  type SettingEditorProps,
} from "./components/Setting.js";
