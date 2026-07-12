import { BarChart3, Newspaper, Search, Trophy } from "lucide-react";

const items = [
  { label: "Today", href: "#dashboard", icon: BarChart3 },
  { label: "Football", href: "#football", icon: Trophy },
  { label: "News", href: "#news", icon: Newspaper },
  { label: "Search", href: "#football-players", icon: Search }
];

export function MobileBottomNav({ active }: { active: "dashboard" | "football" | "news" }) {
  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile terminal navigation">
      {items.map((item) => {
        const Icon = item.icon;
        const selected = item.href.includes(active) || (active === "dashboard" && item.href === "#dashboard");
        return (
          <a className={selected ? "active" : ""} href={item.href} key={item.href}>
            <Icon aria-hidden="true" size={17} />
            <span>{item.label}</span>
          </a>
        );
      })}
    </nav>
  );
}
