import { Link, useLocation } from "wouter";
import { Users, Upload, FolderOpen, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { path: "/students", label: "Students", icon: Users },
  { path: "/upload", label: "Upload", icon: Upload },
  { path: "/library", label: "Library", icon: FolderOpen },
  { path: "/outcomes", label: "Outcomes", icon: BookOpen },
];

export function MobileNav() {
  const [location] = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background md:hidden">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const isActive = location === item.path || location.startsWith(item.path + "/");
          return (
            <Link
              key={item.path}
              href={item.path}
              className={cn(
                "flex flex-col items-center justify-center py-3 px-4 min-w-[64px] transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
              data-testid={`nav-${item.label.toLowerCase()}`}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-xs mt-1 font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
