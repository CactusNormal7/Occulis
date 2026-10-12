import type { PlayerId } from "@occulis/core";
import type { PlayerCard } from "@occulis/protocol";
import { Badge, PlayerPlate, useMessages } from "@occulis/ui";

/** La plaque d'un joueur, depuis sa carte : Elo, bilan, et ses faits d'armes par leur nom. */
export function CardPlate({ card, camp, self, align }: { card: PlayerCard; camp: PlayerId; self: boolean; align: "start" | "end" }) {
  const all = useMessages();
  const m = all.prepare.reveal;
  return (
    <PlayerPlate
      name={card.handle}
      camp={camp}
      align={align}
      tag={self ? m.you : undefined}
      lines={[m.elo(card.elo), card.played === 0 ? m.newcomer : m.record(card.played, card.won)]}
      badges={card.feats.length === 0 ? undefined : card.feats.map((id) => <Badge key={id}>{all.feats.names[id] ?? id}</Badge>)}
    />
  );
}
