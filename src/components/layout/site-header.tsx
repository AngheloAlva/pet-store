import Link from "next/link";
import { List, MagnifyingGlass, PawPrint } from "@phosphor-icons/react/dist/ssr";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Container } from "./container";
import { CartIndicator } from "./cart-indicator";
import { PersonaSelector } from "./persona-selector";
import { getCurrentUser } from "@/lib/session";
import { siteConfig } from "@/lib/site";

export async function SiteHeader() {
  const currentUser = await getCurrentUser();
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <Container className="flex h-16 items-center gap-4">
        <Sheet>
          <SheetTrigger
            render={
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Abrir menú" />
            }
          >
            <List size={20} />
          </SheetTrigger>
          <SheetContent side="left" className="w-72">
            <SheetHeader>
              <SheetTitle className="font-heading text-2xl">SimplePet</SheetTitle>
              <SheetDescription>Todo para tu mascota</SheetDescription>
            </SheetHeader>
            <nav className="mt-6 flex flex-col">
              {siteConfig.nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-md px-3 py-2 text-base font-medium hover:bg-accent"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </SheetContent>
        </Sheet>

        <Link href="/" className="flex items-center gap-2 font-heading text-xl font-semibold">
          <PawPrint size={24} weight="fill" className="text-primary" />
          <span>SimplePet</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1 ml-4">
          {siteConfig.nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <Button variant="ghost" size="icon" aria-label="Buscar">
            <MagnifyingGlass size={20} />
          </Button>
          <PersonaSelector currentUser={currentUser} />
          <CartIndicator />
        </div>
      </Container>
    </header>
  );
}
