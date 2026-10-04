import { SearchField } from "@occulis/ui";

export const Empty = () => <SearchField placeholder="Pseudo ou adresse…" onSearch={() => undefined} />;

export const Filled = () => <SearchField defaultValue="anne" placeholder="Pseudo ou adresse…" onSearch={() => undefined} />;
