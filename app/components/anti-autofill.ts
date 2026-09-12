/**
 * Opt-out standard des gestionnaires de mots de passe (Bitwarden, 1Password,
 * LastPass, Dashlane, Proton Pass…). À étendre sur tout champ de saisie qui ne
 * doit pas être proposé à l'enregistrement automatique.
 */
export const ANTI_AUTOFILL_PROPS = {
  "data-bwignore": true,
  "data-1p-ignore": true,
  "data-lpignore": "true",
  "data-form-type": "other",
  "data-protonpass-ignore": true,
  "data-dashlane-ignore": true,
} as const;
