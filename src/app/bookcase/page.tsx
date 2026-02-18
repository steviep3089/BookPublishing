import Link from "next/link";
import { Caveat } from "next/font/google";

const caveat = Caveat({ subsets: ["latin"], weight: ["600", "700"] });

type Hotspot = {
  key: string;
  xPercent: number;
  yPercent: number;
  label: string;
  targetPath: string;
};

type Layout = { hotspots: Hotspot[] };

const DEFAULT_LAYOUT: Layout = {
  hotspots: [
    {
      key: "creating",
      xPercent: 25.1,
      yPercent: 12.06,
      label: "Books I'm creating",
      targetPath: "/bookcase/creating",
    },
    {
      key: "recommended",
      xPercent: 69.27,
      yPercent: 11.96,
      label: "Books I'd recommend",
      targetPath: "/bookcase/recommended",
    },
  ],
};

export default function BookcasePage() {
  return (
    <main className="bookcase-scene">
      <div className="bookcase-canvas">
        {DEFAULT_LAYOUT.hotspots.map((item) => (
          <Link
            key={item.key}
            href={item.targetPath}
            className={`bookcase-hotspot bookcase-hotspot-home ${caveat.className}`}
            style={{ left: `${item.xPercent}%`, top: `${item.yPercent}%` }}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </main>
  );
}
