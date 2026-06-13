/**
 * Every chain/identity integration runs in 'stub' mode until its corresponding
 * env var is configured, so the UI can be built and demoed before any real
 * RPC/API credentials exist.
 */
export type ServiceMode = 'live' | 'stub';
