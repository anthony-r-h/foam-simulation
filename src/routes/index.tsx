import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Simulated boxing glove compression" },
      {
        name: "description",
        content:
          "Build layered boxing-glove foam configurations and simulate their impact response.",
      },
      { property: "og:title", content: "Simulated boxing glove compression" },
      {
        property: "og:description",
        content:
          "Build layered boxing-glove foam configurations and simulate their impact response.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="app-frame">
      <h1 className="visually-hidden">Simulated boxing glove compression</h1>
      <iframe
        title="Simulated boxing glove compression"
        src="/simulator.html"
        className="app-iframe"
      />
    </main>
  );
}
