declare module 'virtual:preview-serializer' {
  /** IIFE build of `runtime/shared/serialize.ts`, exposing `__previewSerializer`. */
  const serializerSource: string;
  export default serializerSource;
}

declare module 'virtual:preview-test-api' {
  /** IIFE build of `runtime/shared/testing/testApi.ts`, exposing `__previewTestApi`. */
  const testApiSource: string;
  export default testApiSource;
}
