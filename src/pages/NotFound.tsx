import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Compass, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * 404 page, styled like the rest of the app (dark background, primary
 * accent, real button) instead of the old plain grey box.
 */
const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    // Only log in development mode to avoid exposing route structure in production
    if (import.meta.env.DEV) {
      console.error("404 Error: User attempted to access non-existent route:", location.pathname);
    }
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 text-primary">
          <Compass className="h-8 w-8" />
        </div>
        <div>
          <h1 className="text-6xl font-bold tracking-tight">404</h1>
          <p className="mt-3 text-xl font-medium">This page does not exist</p>
          <p className="mt-2 text-sm text-muted-foreground">
            The address <span className="font-mono">{location.pathname}</span> was
            not found. It may have moved, or the link may be wrong.
          </p>
        </div>
        <Button asChild className="shadow-lg">
          <Link to="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to dashboard
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
