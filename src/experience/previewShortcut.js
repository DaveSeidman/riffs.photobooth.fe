export function previewShortcut(event) {
  if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return null;
  const target=event.target;
  if (target?.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target?.tagName ?? '')) return null;
  return ({b:'blush',p:'pulse',a:'auto'})[event.key?.toLowerCase()]
    ?? ({KeyB:'blush',KeyP:'pulse',KeyA:'auto'})[event.code] ?? null;
}
