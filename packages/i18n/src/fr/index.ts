import type { Messages } from "../messages.js";
import { account } from "./account.js";
import { admin } from "./admin.js";
import { auth } from "./auth.js";
import { feats } from "./feats.js";
import { game } from "./game.js";
import { mail } from "./mail.js";
import { prepare } from "./prepare.js";
import { profile } from "./profile.js";
import { team } from "./team.js";
import { ui } from "./ui.js";

export const fr: Messages = { ui, game, auth, account, profile, admin, mail, team, feats, prepare };
