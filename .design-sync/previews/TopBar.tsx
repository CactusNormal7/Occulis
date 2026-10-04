import { TopBar } from "@occulis/ui";

export const BackOffice = () => (
  <TopBar
    section="back-office"
    brandHref="#"
    tabs={[
      { href: "#", label: "Vue d'ensemble" },
      { href: "#", label: "Comptes", current: true },
      { href: "#", label: "Parties" },
    ]}
    end={
      <>
        <span>Cactus</span>
        <a href="#">retour au jeu →</a>
      </>
    }
  />
);

export const Minimal = () => <TopBar section="partie" end={<span>tour 12 — à vous de jouer</span>} />;
