import { useState, useEffect } from "react";
import { getSettings, updateSettings, subscribeSettings, type AppSettings } from "../settings";
import type { ClefType } from "../model";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";

interface SettingsPanelProps {
  visible: boolean;
  onClose: () => void;
}

export function SettingsPanel({ visible, onClose }: SettingsPanelProps) {
  const [settings, setSettings] = useState<AppSettings>(getSettings());

  useEffect(() => {
    const unsub = subscribeSettings((s) => setSettings({ ...s }));
    return unsub;
  }, []);

  function update<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    updateSettings({ [key]: value });
  }

  return (
    <Dialog open={visible} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <section>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">General</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Default Tempo</span>
                <Input
                  type="number"
                  min={20}
                  max={300}
                  value={settings.defaultTempo}
                  onChange={(e) => update("defaultTempo", parseInt(e.target.value) || 120)}
                  className="w-20 h-7"
                />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Time Signature</span>
                <div className="flex gap-1 items-center">
                  <Input
                    type="number"
                    min={1}
                    max={16}
                    value={settings.defaultTimeSignature.numerator}
                    onChange={(e) =>
                      update("defaultTimeSignature", {
                        ...settings.defaultTimeSignature,
                        numerator: parseInt(e.target.value) || 4,
                      })
                    }
                    className="w-12 h-7"
                  />
                  <span className="text-muted-foreground">/</span>
                  <select
                    value={settings.defaultTimeSignature.denominator}
                    onChange={(e) =>
                      update("defaultTimeSignature", {
                        ...settings.defaultTimeSignature,
                        denominator: parseInt(e.target.value),
                      })
                    }
                    className="h-7 rounded-md border border-input bg-background px-2 text-sm"
                  >
                    <option value={2}>2</option>
                    <option value={4}>4</option>
                    <option value={8}>8</option>
                    <option value={16}>16</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Default Clef</span>
                <select
                  value={settings.defaultClef}
                  onChange={(e) => update("defaultClef", e.target.value as ClefType)}
                  className="h-7 rounded-md border border-input bg-background px-2 text-sm"
                >
                  <option value="treble">Treble</option>
                  <option value="bass">Bass</option>
                  <option value="alto">Alto</option>
                  <option value="tenor">Tenor</option>
                </select>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Auto Beam</span>
                <input
                  type="checkbox"
                  checked={settings.autoBeam}
                  onChange={(e) => update("autoBeam", e.target.checked)}
                  className="accent-primary"
                />
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Playback</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Playback Enabled</span>
                <input type="checkbox" checked={settings.playbackEnabled} onChange={(e) => update("playbackEnabled", e.target.checked)} className="accent-primary" />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Metronome Enabled</span>
                <input type="checkbox" checked={settings.metronomeEnabled} onChange={(e) => update("metronomeEnabled", e.target.checked)} className="accent-primary" />
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">AI</h3>
            <div className="flex justify-between items-center">
              <span className="text-sm">AI Provider</span>
              <select
                value={settings.aiProvider}
                onChange={(e) => update("aiProvider", e.target.value as "anthropic" | "openai")}
                className="h-7 rounded-md border border-input bg-background px-2 text-sm"
              >
                <option value="anthropic">Anthropic</option>
                <option value="openai">OpenAI</option>
              </select>
            </div>
          </section>

          <section>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">History</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Max Snapshots</span>
                <Input
                  type="number"
                  min={5}
                  max={200}
                  value={settings.historyMaxSnapshots}
                  onChange={(e) => update("historyMaxSnapshots", parseInt(e.target.value) || 50)}
                  className="w-20 h-7"
                />
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Appearance</h3>
            <div className="flex justify-between items-center">
              <span className="text-sm">Keyboard Layout</span>
              <select
                value={settings.keyboardLayout}
                onChange={(e) => update("keyboardLayout", e.target.value as "standard" | "custom")}
                className="h-7 rounded-md border border-input bg-background px-2 text-sm"
              >
                <option value="standard">Standard</option>
                <option value="custom">Custom</option>
              </select>
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
