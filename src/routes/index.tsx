import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EMICP — إدارة المشتريات" },
      { name: "description", content: "نظام EMICP التفاعلي لإدارة المشتريات وسير العمل." },
      { property: "og:title", content: "EMICP — إدارة المشتريات" },
      { property: "og:description", content: "نظام EMICP التفاعلي لإدارة المشتريات وسير العمل." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="h-screen w-full overflow-hidden bg-background">
      <iframe
        title="نظام EMICP التفاعلي"
        src="/emicp/index.html"
        className="h-full w-full border-0"
      />
    </main>
  );
}
