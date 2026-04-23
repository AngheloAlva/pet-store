import type { Icon as PhosphorIcon } from "@phosphor-icons/react";
import { Container } from "@/components/layout/container";

type ComingSoonItem = {
  title: string;
  description: string;
};

type Props = {
  title: string;
  description: string;
  Icon: PhosphorIcon;
  items: ComingSoonItem[];
};

export function ComingSoon({ title, description, Icon, items }: Props) {
  return (
    <Container className="py-16">
      <div className="mx-auto max-w-3xl">
        <div className="flex flex-col items-center text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Icon size={26} aria-hidden />
          </div>
          <h1 className="mt-4 font-heading text-4xl font-semibold tracking-tight">
            {title}
          </h1>
          <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Próximamente
          </p>
          <p className="mt-4 text-lg text-muted-foreground">{description}</p>
        </div>

        <ul className="mt-10 grid gap-4 sm:grid-cols-2">
          {items.map((item) => (
            <li
              key={item.title}
              className="rounded-lg border border-border bg-background p-4"
            >
              <p className="font-heading text-base font-semibold text-foreground">
                {item.title}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {item.description}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </Container>
  );
}
