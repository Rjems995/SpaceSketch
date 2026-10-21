export function authDestination(value: unknown) {
  return typeof value === "string" &&
    (value === "/dashboard" || /^\/editor\/[0-9a-f-]{36}$/i.test(value))
    ? value
    : "/dashboard";
}
