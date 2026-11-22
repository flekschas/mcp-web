// The prebuilt browser bundle has no type declarations, and the package's own
// declarations pull in TypeScript sources that this project's settings reject.
// These are the parts the demo uses.
declare module '@genome-spy/core/browser' {
  export interface EmbedResult {
    finalize(): void;
    awaitVisibleLazyData(): Promise<void>;
  }

  export function embed(
    element: HTMLElement,
    spec: object,
    options?: {
      onError?: (error: unknown, container: HTMLElement) => boolean | undefined;
    },
  ): Promise<EmbedResult>;
}
