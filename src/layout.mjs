export const WORLD = { width: 1280, height: 720 };

// Use the visible area of the embedded page, not the device's outer window.
export function visibleViewport(layoutWidth, layoutHeight, viewport) {
  const width = Math.max(1, Math.min(layoutWidth, viewport?.width || layoutWidth));
  const height = Math.max(1, Math.min(layoutHeight, viewport?.height || layoutHeight));
  return { width, height, left: Math.max(0, viewport?.offsetLeft || 0), top: Math.max(0, viewport?.offsetTop || 0) };
}

export function cameraFor(width, height, battle = false, insets = {}) {
  if (!battle) {
    const scale = Math.max(width / WORLD.width, height / WORLD.height);
    return { scale, x: (width - WORLD.width * scale) / 2, y: (height - WORLD.height * scale) / 2 };
  }
  const left = (insets.left || 0) + 12, top = (insets.top || 0) + 62;
  const arenaWidth = Math.max(1, width - left - (insets.right || 0) - 12);
  const arenaHeight = Math.max(1, height - top - (insets.bottom || 0) - 88);
  const scale = Math.min(arenaWidth / 1050, arenaHeight / 480, 1.35);
  return { scale, x: left + arenaWidth / 2 - 640 * scale, y: top + arenaHeight / 2 - 360 * scale };
}

export function screenToWorld(x, y, camera) {
  return { x: (x - camera.x) / camera.scale, y: (y - camera.y) / camera.scale };
}

export function worldToScreen(x, y, camera) {
  return { x: camera.x + x * camera.scale, y: camera.y + y * camera.scale };
}

export function hitActor(point, actors, scale = 1) {
  const pad = 8 / scale;
  const hits = actors.filter(a => a.alive !== false && Math.abs(point.x - a.x) <= a.width / 2 + pad && point.y >= a.y - a.height - pad && point.y <= a.y + 12 + pad);
  hits.sort((a, b) => Math.hypot(point.x - a.x, point.y - a.y + a.height / 2) - Math.hypot(point.x - b.x, point.y - b.y + b.height / 2));
  return hits[0] || null;
}
