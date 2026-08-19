export class SiteEditorError extends Error {
  constructor(
    readonly status: 400 | 404 | 409 | 500 | 502 | 503,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}
