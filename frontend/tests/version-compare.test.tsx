import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import VersionCompare from "@/components/version-compare";
import { template, makeFurniture } from "@/lib/model";
it("renders two different design versions without mutating either", () => {
  const before = template("Empty Room"),
    after = structuredClone(before);
  after.furniture.push(makeFurniture("chair", 1, 1));
  const original = JSON.stringify([before, after]);
  const html = renderToStaticMarkup(
    <VersionCompare
      versions={[
        { id: "before", label: "Revision 1", project: before },
        { id: "after", label: "Current", project: after },
      ]}
    />,
  );
  expect(html).toContain("Before version");
  expect(html).toContain("After version");
  expect(html).toContain("0 furniture items");
  expect(html).toContain("1 furniture items");
  expect(JSON.stringify([before, after])).toBe(original);
});
