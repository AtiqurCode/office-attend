export const AuthMethods = {
  PIN: 'pin',
  FACE: 'face',
  EYE: 'eye',
  /** Admin forgot-punch / manual correction — not a kiosk method. */
  MANUAL: 'manual',
} as const;

export type AuthMethod = (typeof AuthMethods)[keyof typeof AuthMethods];

/** Methods companies can enable on the kiosk. */
export const ALL_AUTH_METHODS: AuthMethod[] = [
  AuthMethods.PIN,
  AuthMethods.FACE,
  AuthMethods.EYE,
];

export function parseAuthMethods(raw: string | null | undefined): AuthMethod[] {
  if (!raw) return [AuthMethods.PIN];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [AuthMethods.PIN];
    return parsed.filter((m): m is AuthMethod =>
      ALL_AUTH_METHODS.includes(m as AuthMethod)
    );
  } catch {
    return [AuthMethods.PIN];
  }
}

export function serializeAuthMethods(methods: AuthMethod[]): string {
  const unique = ALL_AUTH_METHODS.filter((m) => methods.includes(m));
  return JSON.stringify(unique.length ? unique : [AuthMethods.PIN]);
}
