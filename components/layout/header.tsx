import Link from 'next/link';

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center mx-auto px-4">
        <div className="mr-4 flex items-center">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            {/* Placeholder for a logo/icon */}
            <span className="font-bold sm:inline-block">
              MCP Auth Demo
            </span>
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            {/* Add navigation links here */}
            <Link 
              href="/dashboard"
              className="transition-colors hover:text-foreground/80 text-foreground/60"
            >
              Dashboard
            </Link>
            <Link
              href="/vault"
              className="transition-colors hover:text-foreground/80 text-foreground/60"
            >
              Vault
            </Link>
             {/* Add more links as needed */}
            {/* <Link href="/client" className="transition-colors hover:text-foreground/80 text-foreground/60">Client</Link> */}
          </nav>
        </div>
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          {/* Add login/logout status or theme toggle here later */}
          <nav className="flex items-center">
             {/* Placeholder for dynamic items */}
          </nav>
        </div>
      </div>
    </header>
  );
} 