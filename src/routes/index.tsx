import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Glove Foam Mechanics" },
      {
        name: "description",
        content:
          "Explore foam compositions and their response to impact, with layered compression models and rigid or heavy-bag targets.",
      },
      { property: "og:title", content: "Glove Foam Mechanics" },
      {
        property: "og:description",
        content:
          "Explore foam compositions and their response to impact, with layered compression models and rigid or heavy-bag targets.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="h-dvh w-full overflow-hidden">
      <h1 className="sr-only">Glove Foam Mechanics</h1>
      <iframe
        title="Glove Foam Mechanics"
        src="/foam-stack/foam_stack_builder_v12.html"
        className="block h-full w-full border-0"
      />
    </main>
  );
}
