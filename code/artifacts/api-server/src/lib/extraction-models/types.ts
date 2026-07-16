export interface ModelCaller {
  call(
    systemPrompt: string,
    userContent: string | { imageBytes: Buffer }
  ): Promise<unknown>;
}

export class ExtractionModelError extends Error {
  model: string;
  status?: number;
  body?: unknown;

  constructor(model: string, message: string, status?: number, body?: unknown) {
    super(message);
    this.name = "ExtractionModelError";
    this.model = model;
    this.status = status;
    this.body = body;
  }
}

export class ExtractionModelNotConfiguredError extends Error {
  constructor(message?: string) {
    super(
      message ||
        "no EXTRACTION_MODEL selected — run the §11 eval harness bake-off (D-02) and set EXTRACTION_MODEL + the corresponding API key"
    );
    this.name = "ExtractionModelNotConfiguredError";
  }
}
