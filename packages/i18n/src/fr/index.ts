import type { Messages } from "../messages.js";
import { account } from "./account.js";
import { admin } from "./admin.js";
import { auth } from "./auth.js";
import { game } from "./game.js";
import { mail } from "./mail.js";
import { profile } from "./profile.js";
import { ui } from "./ui.js";

export const fr: Messages = { ui, game, auth, account, profile, admin, mail };
