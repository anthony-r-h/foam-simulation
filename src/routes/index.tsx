import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Foam — a fresh start" },
      {
        name: "description",
        content: "Foam is a freshly initialized project, ready to be built on.",
      },
      { property: "og:title", content: "Foam — a fresh start" },
      {
        property: "og:description",
        content: "Foam is a freshly initialized project, ready to be built on.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <h1 className="text-5xl font-semibold tracking-tight text-foreground">foam</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        Project initialized. Ready for the next step.
      </p>
    </main>
  );
}
