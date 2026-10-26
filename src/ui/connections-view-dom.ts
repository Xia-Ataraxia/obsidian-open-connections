// Result elements are rebuilt on every render; element-scoped listeners are released with the
// node, whereas Component.registerDomEvent would retain every detached node until the view closes.
export function listenOnRendered(
  element: HTMLElement,
  type: string,
  callback: (event: Event) => void,
): void {
  element.addEventListener(type, callback);
}
