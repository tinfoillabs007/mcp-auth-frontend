import { BrowserInfoSaver } from "@/components/browser-info/browser-info-saver";

export default function BrowserInfoPage() {
  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold">Browser Information</h1>
      <p className="text-muted-foreground">
        Save your current browser information to your secure vault.
      </p>
      <BrowserInfoSaver />
    </section>
  );
} 