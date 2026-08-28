import React from "react"
import { Home, User, Calendar, Zap, CreditCard } from "lucide-react"
import { cn } from "@/lib/utils"

interface NavLinkProps {
  key?: React.Key;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}

// Helper component for navigation links
function NavLink({ href, icon: Icon, label }: NavLinkProps) {
  return (
    <a 
      href={href} 
      className="group flex items-center gap-1.5 text-sm font-medium text-foreground/70 hover:text-foreground transition-colors whitespace-nowrap"
    >
      <Icon className="w-4 h-4 opacity-70 group-hover:opacity-100" />
      <span>{label}</span>
    </a>
  )
}

export interface NotchNavbarProps extends React.HTMLAttributes<HTMLElement> {
  className?: string;
  logo?: React.ReactNode;
}

export function NotchNavbar({ className, logo, ...props }: NotchNavbarProps) {
  // Navigation items configuration
  const items = {
    left: [
      { label: "Home", href: "#home", icon: Home },
      { label: "About", href: "#about", icon: User },
      { label: "Events", href: "#events", icon: Calendar }
    ],
    right: [
      { label: "Sponsors", href: "#sponsors", icon: Zap },
      { label: "Pricing", href: "#pricing", icon: CreditCard }
    ]
  }

  return (
    <nav className={cn("relative z-50", className)} {...props}>
      <div className="flex items-center justify-between px-6 py-3 bg-black/40 backdrop-blur-md border border-white/10 rounded-full">
        {logo || <span className="font-bold text-white tracking-wider">FLKRD</span>}
        <div className="hidden md:flex items-center gap-6">
          {items.left.map((item) => (
            <NavLink key={item.label} href={item.href} icon={item.icon} label={item.label} />
          ))}
          {items.right.map((item) => (
            <NavLink key={item.label} href={item.href} icon={item.icon} label={item.label} />
          ))}
        </div>
      </div>
    </nav>
  )
}

export default NotchNavbar;
