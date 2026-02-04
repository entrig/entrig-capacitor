type RouteHandler = (params: Record<string, string>) => void;

interface Route {
  pattern: RegExp;
  handler: RouteHandler;
  paramNames: string[];
}

const routes: Route[] = [];

export function route(path: string, handler: RouteHandler): void {
  const paramNames: string[] = [];
  // Convert path pattern like '/chat/:id' to regex
  const pattern = path.replace(/:(\w+)/g, (_match, paramName) => {
    paramNames.push(paramName);
    return '([^/]+)';
  });
  routes.push({ pattern: new RegExp(`^${pattern}$`), handler, paramNames });
}

export function navigate(path: string): void {
  window.location.hash = path;
}

export function startRouter(): void {
  const handleRoute = () => {
    const hash = window.location.hash.slice(1) || '/sign-in';
    // Split hash from query string
    const [path, queryString] = hash.split('?');

    for (const { pattern, handler, paramNames } of routes) {
      const match = path.match(pattern);
      if (match) {
        const params: Record<string, string> = {};
        paramNames.forEach((name, i) => {
          params[name] = decodeURIComponent(match[i + 1]);
        });

        // Parse query params
        if (queryString) {
          const searchParams = new URLSearchParams(queryString);
          searchParams.forEach((value, key) => {
            params[key] = value;
          });
        }

        handler(params);
        return;
      }
    }

    // Default: go to sign-in
    navigate('/sign-in');
  };

  window.addEventListener('hashchange', handleRoute);
  handleRoute();
}
