"use client";

const REGIONS = ["All", "Pacific", "Americas", "EMEA", "China", "Other"] as const;
export type Region = (typeof REGIONS)[number];

type Props = {
  selected: Region;
  onChange: (region: Region) => void;
  counts?: Partial<Record<Region, number>>;
};

export default function RegionTabs({ selected, onChange, counts }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {REGIONS.map((region) => (
        <button
          key={region}
          onClick={() => onChange(region)}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
            selected === region
              ? "bg-red-500 text-white"
              : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white"
          }`}
        >
          {region}
          {counts?.[region] !== undefined && (
            <span className="ml-1 opacity-60">{counts[region]}</span>
          )}
        </button>
      ))}
    </div>
  );
}
