/**
 * System clipboard access with honest types. The DOM lib declares
 * `navigator.clipboard` as always present, but it is `undefined` in
 * insecure contexts — hence the explicit widening cast (documented here,
 * in exactly one place).
 */
export function systemClipboard(): Clipboard | undefined {
  if (typeof navigator === "undefined") return undefined;
  // Intentional: DOM lib types over-promise (undefined in insecure contexts).
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
  return navigator.clipboard as unknown as Clipboard | undefined;
}
