// Static terminal hierarchy (inhoudsopgave) — local, no server required.
export type Node = {
  id: string;
  name: string;
  parent_id: string | null;
  order: number;
  depth: number;
  has_children: boolean;
  is_plattegrond: boolean;
};

type Raw = { name: string; plattegrond?: boolean; children?: Raw[] };

const TREE: Raw[] = [
  { name: "Plattegrond", plattegrond: true },
  {
    name: "Zeekade",
    children: [
      { name: "Algemeen" },
      { name: "A1" }, { name: "A4" }, { name: "A2" }, { name: "A3" },
      { name: "C11 en WC12" }, { name: "C21 en WC22" },
    ],
  },
  {
    name: "Middenveld",
    children: [
      { name: "Algemeen" },
      { name: "L1" }, { name: "L2" }, { name: "L3" }, { name: "L4" },
      { name: "L5" }, { name: "L6" }, { name: "L7" },
      {
        name: "G-banden",
        children: [
          { name: "G11" }, { name: "G12" }, { name: "G13" }, { name: "G14" },
          { name: "G15" }, { name: "G16" }, { name: "G17" },
        ],
      },
    ],
  },
  {
    name: "Binnenkade",
    children: [
      { name: "Algemeen" },
      { name: "B2" }, { name: "B3" }, { name: "B4" },
      { name: "WH21 en H22" }, { name: "WH31 en H32" }, { name: "WH41 en H42" },
    ],
  },
  {
    name: "D-banden",
    children: [
      { name: "Algemeen" },
      { name: "D40" }, { name: "D10" }, { name: "D20" }, { name: "D30" },
    ],
  },
  {
    name: "K-banden",
    children: [
      { name: "Algemeen" },
      { name: "K10" }, { name: "K11" }, { name: "K20" }, { name: "K30" },
      { name: "K40" }, { name: "K50" }, { name: "K60" }, { name: "K70" },
      { name: "K80" }, { name: "K90" },
    ],
  },
  {
    name: "TLS",
    children: [
      { name: "Algemeen" },
      { name: "Loc" }, { name: "Bediening" }, { name: "W10" },
    ],
  },
  { name: "Rijdend materieel" },
  {
    name: "Mentor info",
    children: [{ name: "Algemeen" }],
  },
];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function flatten(): Node[] {
  const nodes: Node[] = [];
  const walk = (items: Raw[], parentId: string | null, prefix: string, depth: number) => {
    items.forEach((item, order) => {
      const id = (prefix ? prefix + "-" : "") + slugify(item.name);
      const children = item.children;
      nodes.push({
        id,
        name: item.name,
        parent_id: parentId,
        order,
        depth,
        has_children: !!children,
        is_plattegrond: !!item.plattegrond,
      });
      if (children) walk(children, id, id, depth + 1);
    });
  };
  walk(TREE, null, "", 0);
  return nodes;
}
