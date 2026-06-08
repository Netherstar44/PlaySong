import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export function RoomCode({ code }: { code: string }) {
  const [qrCode, setQrCode] = useState<string>("");
  const { toast } = useToast();

  useEffect(() => {
    const url = `${window.location.origin}/join?code=${code}`;
    QRCode.toDataURL(url, {
      color: { dark: "#FF3366", light: "#0A0A0F" },
      margin: 2
    }).then(setQrCode);
  }, [code]);

  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/join?code=${code}`);
    toast({
      title: "Copied!",
      description: "Room link copied to clipboard.",
    });
  };

  return (
    <div className="flex items-center gap-4 bg-card border rounded-xl p-4">
      {qrCode && <img src={qrCode} alt="Room QR Code" className="w-24 h-24 rounded-lg border-2 border-primary neon-primary" />}
      <div className="flex flex-col gap-2">
        <h3 className="text-sm text-muted-foreground uppercase tracking-wider font-bold">Room Code</h3>
        <div className="text-4xl font-black text-secondary tracking-widest neon-text-secondary">{code}</div>
        <Button size="sm" variant="outline" onClick={copyLink} className="border-secondary text-secondary hover:bg-secondary/10">
          Copy Link
        </Button>
      </div>
    </div>
  );
}