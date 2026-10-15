import * as THREE from "three";
// Deterministic, locally generated textures. No network assets or license dependencies.
export function floorTexture(kind: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, 512, 512);
  let seed = 42;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  if (kind === "wood") {
    for (let row = 0; row < 8; row++) {
      ctx.fillStyle = `rgb(${220 + rand() * 30},${220 + rand() * 25},${220 + rand() * 20})`;
      ctx.fillRect(0, row * 64, 512, 64);
      ctx.fillStyle = "#8f8b81";
      ctx.fillRect(0, row * 64, 512, 2);
      ctx.fillRect((row % 2) * 256, row * 64, 2, 64);
      for (let i = 0; i < 50; i++) {
        ctx.strokeStyle = `rgba(80,70,50,${rand() * 0.12})`;
        ctx.beginPath();
        const y = row * 64 + rand() * 64;
        ctx.moveTo(0, y);
        ctx.bezierCurveTo(180, y + rand() * 5, 330, y - rand() * 5, 512, y);
        ctx.stroke();
      }
    }
  } else if (kind === "tile") {
    ctx.strokeStyle = "#9c9c96";
    ctx.lineWidth = 3;
    ctx.strokeRect(1, 1, 510, 510);
    ctx.beginPath();
    ctx.moveTo(256, 0);
    ctx.lineTo(256, 512);
    ctx.moveTo(0, 256);
    ctx.lineTo(512, 256);
    ctx.stroke();
  } else if (kind === "grass" || kind === "terrain") {
    for (let i = 0; i < 15000; i++) {
      ctx.strokeStyle = `rgba(35,45,20,${0.08 + rand() * 0.2})`;
      ctx.beginPath(); const x = rand() * 512, y = rand() * 512;
      ctx.moveTo(x, y); ctx.lineTo(x + rand() * 4, y - (kind === "grass" ? 7 : 2)); ctx.stroke();
    }
  } else if (kind === "concrete" || kind === "carpet") {
    for (let i = 0; i < 30000; i++) {
      ctx.fillStyle = `rgba(60,60,60,${rand() * (kind === "carpet" ? 0.2 : 0.08)})`;
      ctx.fillRect(rand() * 512, rand() * 512, 2, 2);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(0.5, 0.5);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}
