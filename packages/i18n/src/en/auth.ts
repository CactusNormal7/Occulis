/**
 * Les refus du serveur d'authentification, rangés par **code** et jamais par phrase : le
 * message d'une bibliothèque change sans prévenir, son code est un contrat.
 */
export const auth = {
  tooManyAttempts: "Too many attempts. Try again in a few minutes.",
  failed: "The request failed.",
  unreachable: "Server unreachable. Check your connection.",
  redirectFailed: "Sign-in did not go through. Try again.",
  codes: {
    USER_ALREADY_EXISTS: "This address is already in use.",
    USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "This address is already in use.",
    HANDLE_TAKEN: "This handle is already taken.",
    HANDLE_LENGTH: "The handle must be between 2 and 24 characters.",
    HANDLE_CHARSET: "Letters, digits, spaces, dots, hyphens and underscores only.",
    HANDLE_RESERVED: "This handle is reserved.",
    HANDLE_UNCHANGED: "This is already your handle.",
    HANDLE_COOLDOWN: "The handle can only be changed once a month.",
    PASSWORD_TOO_SHORT: "The password must be at least 10 characters long.",
    PASSWORD_TOO_LONG: "The password must be at most 128 characters long.",
    PASSWORD_COMPROMISED: "This password appears in known data breaches. Choose another one, preferably generated.",
    INVALID_PASSWORD: "Current password is incorrect.",
    CREDENTIAL_ACCOUNT_NOT_FOUND: "This account has no password yet.",
    VALIDATION_ERROR: "Invalid email address.",
    INVALID_EMAIL: "Invalid email address.",
    INVALID_EMAIL_OR_PASSWORD: "Incorrect address or password.",
    INVALID_TOKEN: "This link is no longer valid. Ask for a new one.",
    TOKEN_EXPIRED: "This link has expired. Ask for a new one.",
    BANNED_USER: "This account is suspended.",
    SESSION_EXPIRED: "Your session is too old for this operation. Sign in again.",
    SESSION_NOT_FRESH: "Your session is too old for this operation. Sign in again.",
    IMPERSONATION_READONLY: "Impersonation session: this player's account cannot be changed.",
    FAILED_TO_UNLINK_LAST_ACCOUNT: "You cannot remove your only sign-in method.",
    EMAIL_NOT_VERIFIED: "Confirm your address first.",
  },
  redirects: {
    account_not_linked:
      "An account already exists with this address, but it was never confirmed. Sign in with your password, confirm the address, and Google can then be linked to it.",
    "email_doesn't_match": "This Google account does not use the same address as your Occulis account.",
    access_denied: "Google sign-in cancelled.",
    state_mismatch: "Sign-in expired on the way. Try again.",
    please_restart_the_process: "Sign-in expired on the way. Try again.",
    unable_to_link_account: "This Google account is already linked to another account.",
    account_already_linked_to_different_user: "This Google account is already linked to another account.",
    email_not_found: "Google did not provide an email address.",
  },
};
