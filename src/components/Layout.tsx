import { Link, useLocation } from "react-router-dom";
import { Moon, Sun, LogIn, LogOut, User, Menu, ArrowUp, CheckCircle, Home, FileText, Info, Mail, Users, Download, Bookmark, Shield, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/ThemeProvider";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import FloatingCreatePostButton from "@/components/FloatingCreatePostButton";

interface LayoutProps { children: React.ReactNode; }

const isNativeApp = (): boolean => {
  return !!(window as any).Capacitor?.isNativePlatform?.() || !!(window as any).Capacitor?.isPluginAvailable;
};

const CATEGORIES = ["General", "Technology", "Education", "Lifestyle", "Other"];

const navItems = [
  { to: "/", label: "Home", icon: Home },
  { to: "/all-posts", label: "All Posts", icon: FileText, hasSubItems: true },
  { to: "/bookmarks", label: "Bookmarks", icon: Bookmark },
  { to: "/about", label: "About", icon: Info },
  { to: "/contact", label: "Contact", icon: Mail },
  { to: "/collaborate", label: "Collaborate", icon: Users },
  { to: "/privacy", label: "Privacy Policy", icon: Shield },
];

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const { user, signOut } = useAuth();
  const { isAdmin } = useIsAdmin();
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [native, setNative] = useState(false);
  const [allPostsOpen, setAllPostsOpen] = useState(false);

  useEffect(() => { setNative(isNativeApp()); }, []);
  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 w-full border-b bg-card/95 backdrop-blur-sm shadow-card">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-9 w-9 p-0"><Menu className="h-5 w-5" /></Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-72 bg-sidebar text-sidebar-foreground p-0">
                  <SheetHeader className="p-6 pb-4 border-b border-sidebar-border">
                    <SheetTitle className="text-lg font-bold text-sidebar-foreground">Bridge</SheetTitle>
                  </SheetHeader>
                  <nav className="p-4 space-y-1 overflow-y-auto max-h-[calc(100vh-180px)]">
                    {navItems.map((item) => (
                      item.hasSubItems ? (
                        <Collapsible key={item.to} open={allPostsOpen} onOpenChange={setAllPostsOpen}>
                          <div className="flex items-center">
                            <Link to={item.to} onClick={() => setSidebarOpen(false)}
                              className={cn("flex-1 flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                                location.pathname === item.to ? "bg-sidebar-accent text-sidebar-primary" : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground")}>
                              <item.icon className="h-4 w-4" /><span>{item.label}</span>
                            </Link>
                            <CollapsibleTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-sidebar-foreground/50">
                                <ChevronDown className={cn("h-4 w-4 transition-transform", allPostsOpen && "rotate-180")} />
                              </Button>
                            </CollapsibleTrigger>
                          </div>
                          <CollapsibleContent className="pl-8 space-y-0.5 mt-0.5">
                            {CATEGORIES.map(cat => (
                              <Link key={cat} to={`/all-posts?category=${cat}`} onClick={() => setSidebarOpen(false)}
                                className="block px-3 py-2 rounded-md text-xs font-medium text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors">
                                {cat}
                              </Link>
                            ))}
                          </CollapsibleContent>
                        </Collapsible>
                      ) : (
                        <Link key={item.to} to={item.to} onClick={() => setSidebarOpen(false)}
                          className={cn("flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                            location.pathname === item.to ? "bg-sidebar-accent text-sidebar-primary" : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground")}>
                          <item.icon className="h-4 w-4" /><span>{item.label}</span>
                        </Link>
                      )
                    ))}
                    {isAdmin && (
                      <Link to="/admin" onClick={() => setSidebarOpen(false)}
                        className={cn("flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                          location.pathname === "/admin" ? "bg-sidebar-accent text-sidebar-primary" : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground")}>
                        <LayoutDashboard className="h-4 w-4" /><span>Admin</span>
                      </Link>
                    )}
                    {!native && (
                      <a href="https://play.google.com/store/apps/details?id=app.lovable.4a547dd56e2d482a9fd193145e27d70c" target="_blank" rel="noopener noreferrer"
                        className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors">
                        <Download className="h-4 w-4" /><span>Get the App</span>
                      </a>
                    )}
                  </nav>
                  <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-sidebar-border">
                    {user ? (
                      <div className="space-y-2">
                        <Link to="/profile" onClick={() => setSidebarOpen(false)}
                          className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors">
                          <User className="h-4 w-4" /><span>Profile</span>
                        </Link>
                        <button onClick={() => { signOut(); setSidebarOpen(false); }}
                          className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors w-full">
                          <LogOut className="h-4 w-4" /><span>Sign Out</span>
                        </button>
                      </div>
                    ) : (
                      <Link to="/auth" onClick={() => setSidebarOpen(false)}
                        className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors">
                        <LogIn className="h-4 w-4" /><span>Sign In</span>
                      </Link>
                    )}
                  </div>
                </SheetContent>
              </Sheet>
              <Link to="/" className="text-xl font-bold text-primary hover:opacity-80 transition-opacity">Bridge</Link>
            </div>
            <div className="flex items-center space-x-2">
              {user ? (
                <Link to="/profile" className="flex items-center space-x-2 bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20 hover:bg-primary/20 transition-colors">
                  <div className="relative">
                    <User className="h-4 w-4 text-primary" />
                    <CheckCircle className="absolute -top-1 -right-1 h-2.5 w-2.5 text-green-500 fill-current" />
                  </div>
                  <span className="text-sm font-medium text-primary hidden sm:inline">Profile</span>
                </Link>
              ) : (
                <Link to="/auth"><Button variant="outline" size="sm" className="flex items-center space-x-1"><LogIn className="h-4 w-4" /><span className="hidden sm:inline">Sign In</span></Button></Link>
              )}
              <Button variant="ghost" size="sm" onClick={() => setTheme(theme === "light" ? "dark" : "light")} className="h-9 w-9 p-0">
                <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              </Button>
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <Button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} size="sm"
        className={cn("scroll-to-top fixed bottom-6 right-6 h-10 w-10 rounded-full p-0 shadow-glow", showScrollTop ? "visible" : "")}>
        <ArrowUp className="h-4 w-4" />
      </Button>
      {/* Global floating create-post button — hidden on About / Contact / Collaborate / Auth / Admin / Privacy via the component itself */}
      <FloatingCreatePostButton />
    </div>
  );
};

export default Layout;
