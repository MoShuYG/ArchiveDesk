export const ARGON2_OPTIONS = {
  type: 2, // argon2id
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1
} as const;

export const LOGIN_RATE_LIMIT_WINDOW_MS = 60 * 1000;
export const LOGIN_RATE_LIMIT_MAX = 12;

