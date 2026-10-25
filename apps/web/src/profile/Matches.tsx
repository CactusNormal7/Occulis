import { Card, Pager, useMessages, useToast } from "@occulis/ui";
import { useLoad, whenReady } from "../load/hooks.js";
import * as resources from "./resources.js";
import * as api from "./api.js";
import * as friends from "../social/api.js";
import { relationTo } from "../social/model.js";
import { useSocial } from "./SocialProvider.js";
import { MatchReplayView, MatchTable } from "./parts.js";
import { profileHash } from "./model.js";

// --- Parties --------------------------------------------------------------------------

export function Matches({ offset, readOnly }: { offset: number; readOnly: boolean }) {
  const all = useMessages();
  const m = all.profile.matches;
  const notify = useToast();
  const social = useSocial();
  const { loaded } = useLoad(resources.matches(offset));
  return whenReady(loaded, (page) => (
    <Card title={m.title(page.total)}>
      <MatchTable
        matches={page.matches}
        replayHref={(match) => profileHash({ view: "match", id: match.id })}
        readOnly={readOnly}
        relationOf={(match) => relationTo(social.state, match.opponentId)}
        onAddFriend={(match) =>
          void friends.requestFriend(match.opponentId).then((outcome) => {
            if (!outcome.ok) notify(outcome.message, false);
            else
              notify(
                outcome.value.relation === "friend"
                  ? all.social.toasts.friends(match.opponent)
                  : all.social.toasts.requested(match.opponent),
              );
            social.reload();
          })
        }
      />
      <Pager
        offset={offset}
        shown={page.matches.length}
        total={page.total}
        pageSize={api.PAGE_SIZE}
        hrefFor={(next) => profileHash({ view: "matches", offset: next })}
      />
    </Card>
  ));
}

export function MatchReplay({ id }: { id: string }) {
  const t = useMessages().profile.matches;
  const { loaded } = useLoad(resources.match(id));
  return whenReady(loaded, (match) => (
    <MatchReplayView
      match={match}
      back={{ href: profileHash({ view: "matches", offset: 0 }), label: t.back }}
    />
  ));
}
