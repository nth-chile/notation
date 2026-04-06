import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { activateLicense } from "../licensing";
import { openExternal } from "../utils/openExternal";

const PURCHASE_URL = "https://shipyardnyc.lemonsqueezy.com/checkout/buy/9d811640-4a8e-492c-a61a-53e0093e4782?logo=0&discount=0";
const RECOVER_URL = "https://app.lemonsqueezy.com/my-orders";

interface LicenseNagProps {
  open: boolean;
  onClose: () => void;
}

export function LicenseNag({ open, onClose }: LicenseNagProps) {
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [key, setKey] = useState("");
  const [error, setError] = useState(false);

  const [loading, setLoading] = useState(false);

  async function handleActivate() {
    setLoading(true);
    const valid = await activateLicense(key);
    setLoading(false);
    if (valid) {
      setKey("");
      setShowKeyInput(false);
      setError(false);
      onClose();
    } else {
      setError(true);
    }
  }

  function handleClose() {
    setShowKeyInput(false);
    setKey("");
    setError(false);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Nubium</DialogTitle>
          <DialogDescription>
            Thanks for using Nubium! If you find it useful, please consider purchasing a license to support development.
          </DialogDescription>
        </DialogHeader>

        {showKeyInput ? (
          <div className="space-y-3">
            <Input
              placeholder="Paste license key"
              value={key}
              onChange={(e) => { setKey(e.target.value); setError(false); }}
              onKeyDown={(e) => e.key === "Enter" && handleActivate()}
              autoFocus
            />
            {error && (
              <p className="text-xs text-destructive">Invalid license key.</p>
            )}
            <div className="flex gap-2">
              <Button onClick={handleActivate} disabled={!key.trim() || loading} className="flex-1">
                Activate
              </Button>
              <Button variant="outline" onClick={() => setShowKeyInput(false)} className="flex-1">
                Back
              </Button>
            </div>
            <button
              onClick={() => openExternal(RECOVER_URL)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors block text-center w-full"
            >
              Lost your license key?
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <Button
              onClick={() => openExternal(PURCHASE_URL)}
              className="w-full"
            >
              Purchase License
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowKeyInput(true)}
                className="flex-1"
              >
                Enter License Key
              </Button>
              <Button
                variant="ghost"
                onClick={handleClose}
                className="flex-1"
              >
                Not Now
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
