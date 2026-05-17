declare module '*.json' {
  const value: Record<string, unknown>[] | Record<string, unknown>;
  export default value;
}
