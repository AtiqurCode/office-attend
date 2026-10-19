/**
 * Placeholder HTTP client for future backend integration.
 * V1 is fully offline — do not call this from attendance flows.
 */
export interface ApiClientConfig {
  baseUrl: string;
  getAccessToken?: () => Promise<string | null>;
}

export class ApiClient {
  constructor(private readonly config: ApiClientConfig) {}

  async request<T>(_path: string, _init?: RequestInit): Promise<T> {
    throw new Error(
      'API client is not configured in V1. The app operates offline with local SQLite storage.'
    );
  }
}
