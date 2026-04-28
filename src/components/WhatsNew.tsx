import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import changelogRaw from "../../CHANGELOG.md?raw";

const STORAGE_KEY = "nubium.lastSeenVersion";

interface Section {
  version: string;
  body: string;
}

function parseChangelog(md: string): Section[] {
  const sections: Section[] = [];
  const lines = md.split("\n");
  let current: Section | null = null;
  for (const line of lines) {
    const m = line.match(/^##\s+(.+)$/);
    if (m) {
      if (current) sections.push(current);
      current = { version: m[1].trim(), body: "" };
    } else if (current) {
      current.body += line + "\n";
    }
  }
  if (current) sections.push(current);
  return sections;
}

function isNewerOrEqual(a: string, b: string): boolean {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const da = pa[i] ?? 0;
    const db = pb[i] ?? 0;
    if (da > db) return true;
    if (da < db) return false;
  }
  return true;
}

interface WhatsNewProps {
  visible: boolean;
  onClose: () => void;
  /** When true, show the full changelog instead of just unseen sections. */
  manual?: boolean;
}

export function WhatsNew({ visible, onClose, manual = false }: WhatsNewProps) {
  const sections = parseChangelog(changelogRaw);
  const current = __APP_VERSION__;
  const lastSeen = (() => {
    try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
  })();

  const visibleSections = manual
    ? sections.filter((s) => {
        if (/^unreleased/i.test(s.version)) return import.meta.env.DEV;
        return /^\d+\.\d+\.\d+/.test(s.version);
      })
    : sections.filter((s) => {
        if (/^unreleased/i.test(s.version)) return import.meta.env.DEV;
        const versionMatch = s.version.match(/^(\d+\.\d+\.\d+)/);
        if (!versionMatch) return false;
        const v = versionMatch[1];
        if (lastSeen && isNewerOrEqual(lastSeen, v)) return false;
        return isNewerOrEqual(current, v);
      });

  const dismiss = () => {
    try { localStorage.setItem(STORAGE_KEY, current); } catch { /* ignore */ }
    onClose();
  };

  return (
    <Dialog open={visible} onOpenChange={(o) => { if (!o) dismiss(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{manual ? "Changelog" : "What's new in Nubium"}</DialogTitle>
          <DialogDescription>
            {manual ? "All notable changes, newest first." : "Recent changes since you last opened the app."}
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto space-y-4 pr-1">
          {visibleSections.length === 0 ? (
            <p className="text-sm text-muted-foreground">You're up to date.</p>
          ) : (
            visibleSections.map((s) => (
              <section key={s.version}>
                <h3 className="text-sm font-semibold mb-1.5">{s.version}</h3>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
                  {s.body
                    .split("\n")
                    .map((line) => line.trim())
                    .filter((line) => line.startsWith("- "))
                    .map((line, i) => (
                      <li key={i}>{line.slice(2)}</li>
                    ))}
                </ul>
              </section>
            ))
          )}
        </div>
        <div className="flex justify-end pt-2">
          <Button onClick={dismiss}>Got it</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function shouldShowWhatsNew(): boolean {
  const current = __APP_VERSION__;
  let lastSeen: string | null = null;
  try { lastSeen = localStorage.getItem(STORAGE_KEY); } catch { /* ignore */ }
  if (!lastSeen) {
    // First launch ever — don't pop the modal; mark current as seen.
    try { localStorage.setItem(STORAGE_KEY, current); } catch { /* ignore */ }
    return false;
  }
  return !isNewerOrEqual(lastSeen, current);
}
