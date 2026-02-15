import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home, LayoutDashboard, Coins, Activity } from "lucide-react";

const popularPages = [
  { label: 'Provider Dashboard', href: '/provider', icon: LayoutDashboard },
  { label: 'Rewards', href: '/provider/rewards', icon: Coins },
  { label: 'Activity', href: '/provider/activity', icon: Activity },
];

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background relative overflow-hidden">
      {/* Background orbs */}
      <div className="pointer-events-none absolute top-1/4 left-1/3 h-[400px] w-[400px] rounded-full bg-[radial-gradient(circle,hsl(var(--care-teal)/0.1)_0%,transparent_70%)] blur-3xl" />
      <div className="pointer-events-none absolute bottom-1/4 right-1/3 h-[300px] w-[300px] rounded-full bg-[radial-gradient(circle,hsl(var(--care-green)/0.08)_0%,transparent_70%)] blur-3xl" />

      <div className="text-center relative z-10 animate-fade-in-up">
        <h1
          className="text-[120px] md:text-[180px] font-black leading-none text-gradient-hero select-none"
          style={{ animation: 'float 4s ease-in-out infinite' }}
        >
          404
        </h1>
        <p className="mb-2 text-2xl font-semibold text-foreground">Page not found</p>
        <p className="mb-6 text-muted-foreground max-w-sm mx-auto">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Button asChild variant="gradient" className="mb-8">
          <a href="/">
            <Home className="mr-2 h-4 w-4" />
            Return Home
          </a>
        </Button>

        {/* Popular pages */}
        <div className="flex flex-wrap justify-center gap-3">
          {popularPages.map((page) => (
            <Button key={page.href} variant="outline" size="sm" asChild>
              <Link to={page.href}>
                <page.icon className="mr-1.5 h-3.5 w-3.5" />
                {page.label}
              </Link>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NotFound;
