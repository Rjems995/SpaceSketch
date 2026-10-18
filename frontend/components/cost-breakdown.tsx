"use client";
import type { Project } from "@/lib/model";
import { costAmount, costBreakdown, shoppingListCsv } from "@/lib/costs";
import { download } from "@/lib/storage";
export default function CostBreakdown({ project }: { project: Project }) {
  const groups = costBreakdown(project);
  const total = groups.reduce((n, g) => n + g.totalCents, 0);
  const unpriced = groups.reduce(
    (n, g) =>
      n +
      g.items
        .filter((i) => i.unitCents === 0)
        .reduce((n, i) => n + i.quantity, 0),
    0,
  );
  return (
    <section className="cost-breakdown" aria-label="Furniture cost breakdown">
      <h3>Furniture costs · all floors</h3>
      <p>
        Assigned by each piece’s center. In overlapping rooms, the smallest
        containing room is used. Prices use your entered amounts, without
        currency conversion.
      </p>
      {groups.length === 0 ? (
        <p>Add furniture to start a shopping list.</p>
      ) : (
        <>
          <div className="stat">
            <span>Total estimate</span>
            <strong>{costAmount(total)}</strong>
          </div>
          {unpriced > 0 && <p>{unpriced} pieces have a zero or unset price.</p>}
          {groups.map((g) => (
            <details key={g.floorId + ":" + g.roomId}>
              <summary>
                {g.floor} / {g.room} — {costAmount(g.totalCents)}
              </summary>
              <ul>
                {g.items.map((item, i) => (
                  <li key={i}>
                    <span>
                      {item.quantity} × {item.furniture.name}
                    </span>
                    <strong>{costAmount(item.totalCents)}</strong>
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </>
      )}
      <button
        className="secondary"
        disabled={!groups.length}
        onClick={() =>
          download(
            new Blob([shoppingListCsv(project)], {
              type: "text/csv;charset=utf-8",
            }),
            `${project.name}-shopping-list.csv`,
          )
        }
      >
        Export shopping list (CSV)
      </button>
    </section>
  );
}
