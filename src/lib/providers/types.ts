export interface GenerateOptions {
  imageBase64: string
  model: string
  signal?: AbortSignal
  /** Called with the accumulated text so far. */
  onToken: (accumulated: string) => void
}

export interface Provider {
  id: string
  /** Models to offer; preferred default first. */
  listModels(signal?: AbortSignal): Promise<string[]>
  generate(opts: GenerateOptions): Promise<string>
}
