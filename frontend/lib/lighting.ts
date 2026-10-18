export const defaultLight = {
  enabled: true,
  brightness: 100,
  temperature: 3000,
};
// An artistic warm-to-cool approximation, not a photometric calibration.
export function lightColor(kelvin: number) {
  const stops = [
    [1800, 255, 147, 64],
    [3000, 255, 218, 162],
    [4500, 255, 241, 223],
    [6500, 233, 241, 255],
  ];
  const value = Math.min(6500, Math.max(1800, kelvin));
  const i = Math.max(0, stops.findIndex((s) => s[0] >= value) - 1);
  const a = stops[i],
    b = stops[i + 1];
  const t = (value - a[0]) / (b[0] - a[0]);
  return (
    "#" +
    a
      .slice(1)
      .map((v, j) =>
        Math.round(v + (b[j + 1] - v) * t)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}
