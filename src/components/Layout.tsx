import { Link, useLocation } from "react-router-dom";
import { Moon, Sun, LogIn, LogOut, User, Menu, ArrowUp, CheckCircle, Home, FileText, Info, Mail, Users, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/ThemeProvider";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface LayoutProps {
  children: React.ReactNode;
}

const isNativeApp = (): boolean => {
  return !!(window as any).Capacitor?.isNativePlatform?.() || !!(window as any).Capacitor?.isPluginAvailable;
};

const navItems = [
  { to: "/", label: "Home", icon: Home },
  { to: "/all-posts", label: "All Posts", icon: FileText },
  { to: "/about", label: "About", icon: Info },
  { to: "/contact", label: "Contact", icon: Mail },
  { to: "/collaborate", label: "Collaborate", icon: Users },
];

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const { user, signOut } = useAuth();
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [native, setNative] = useState(false);

  useEffect(() => {
    setNative(isNativeApp());
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b bg-card/95 backdrop-blur-sm shadow-card">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Left: Hamburger + Logo */}
            <div className="flex items-center space-x-3">
              <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-72 bg-sidebar text-sidebar-foreground p-0">
                  <SheetHeader className="p-6 pb-4 border-b border-sidebar-border">
                    <SheetTitle className="text-lg font-bold text-sidebar-foreground">Bridge</SheetTitle>
                  </SheetHeader>
                  <nav className="p-4 space-y-1">
                    {navItems.map((item) => (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={() => setSidebarOpen(false)}
                        className={cn(
                          "flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                          location.pathname === item.to
                            ? "bg-sidebar-accent text-sidebar-primary"
                            : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                        )}
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </Link>
                    ))}

                    {/* Play Store download — web only */}
                    {!native && (
                      <a
                        href="https://play.google.com/store/apps/details?id=app.lovable.4a547dd56e2d482a9fd193145e27d70c"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
                      >
                        <Download className="h-4 w-4" />
                        <span>Get the App</span>
                      </a>
                    )}
                  </nav>

                  {/* Auth section at bottom */}
                  <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-sidebar-border">
                    {user ? (
                      <div className="space-y-2">
                        <Link
                          to="/profile"
                          onClick={() => setSidebarOpen(false)}
                          className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
                        >
                          <User className="h-4 w-4" />
                          <span>Profile</span>
                        </Link>
                        <button
                          onClick={() => { signOut(); setSidebarOpen(false); }}
                          className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors w-full"
                        >
                          <LogOut className="h-4 w-4" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    ) : (
                      <Link
                        to="/auth"
                        onClick={() => setSidebarOpen(false)}
                        className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
                      >
                        <LogIn className="h-4 w-4" />
                        <span>Sign In</span>
                      </Link>
                    )}
                  </div>
                </SheetContent>
              </Sheet>

              <Link to="/" className="text-xl font-bold text-primary hover:opacity-80 transition-opacity">
                Bridge
              </Link>
            </div>

            {/* Right: auth + theme */}
            <div className="flex items-center space-x-2">
              {user ? (
                <Link
                  to="/profile"
                  className="flex items-center space-x-2 bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20 hover:bg-primary/20 transition-colors"
                >
                  <div className="relative">
                    <User className="h-4 w-4 text-primary" />
                    <CheckCircle className="absolute -top-1 -right-1 h-2.5 w-2.5 text-green-500 fill-current" />
                  </div>
                  <span className="text-sm font-medium text-primary hidden sm:inline">Profile</span>
                </Link>
              ) : (
                <Link to="/auth">
                  <Button variant="outline" size="sm" className="flex items-center space-x-1">
                    <LogIn className="h-4 w-4" />
                    <span className="hidden sm:inline">Sign In</span>
                  </Button>
                </Link>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                className="h-9 w-9 p-0"
              >
                <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span className="sr-only">Toggle theme</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Scroll to Top Button */}
      <Button
        onClick={scrollToTop}
        size="sm"
        className={cn(
          "scroll-to-top fixed bottom-6 right-6 h-10 w-10 rounded-full p-0 shadow-glow",
          showScrollTop ? "visible" : ""
        )}
      >
        <ArrowUp className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default Layout;
