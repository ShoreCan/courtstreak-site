export function notificationPlacement(anchor, viewport) {
  const gap = Math.min(12, viewport.width / 8, viewport.height / 8),
    width = Math.max(0, Math.min(420, viewport.width - gap * 2));
  const minLeft = viewport.left + gap,
    maxLeft = viewport.left + viewport.width - gap - width;
  const minTop = viewport.top + gap,
    bottom = viewport.top + viewport.height - gap;
  const minRoom = Math.min(300, Math.max(0, viewport.height - gap * 2));
  const top = Math.max(minTop, Math.min(anchor.bottom + 8, bottom - minRoom));
  return {
    left: Math.max(minLeft, Math.min(anchor.right - width, maxLeft)),
    top,
    width,
    maxHeight: Math.min(650, Math.max(0, bottom - top)),
  };
}
export function visibleViewport() {
  const view = window.visualViewport;
  return {
    left: view?.offsetLeft || 0,
    top: view?.offsetTop || 0,
    width: view?.width || window.innerWidth,
    height: view?.height || window.innerHeight,
  };
}
