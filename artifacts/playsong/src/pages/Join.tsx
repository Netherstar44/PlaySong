import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Join() {
  const [code, setCode] = useState("");
  const [, setLocation] = useLocation();

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length === 6) {
      setLocation(`/guest/${code.toUpperCase()}`);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-6 bg-background relative">
      <div className="max-w-md w-full bg-card p-8 rounded-2xl border neon-secondary">
        <h1 className="text-3xl font-bold mb-6 text-center text-secondary neon-text-secondary">Join the Party</h1>
        <form onSubmit={handleJoin} className="space-y-6">
          <div className="space-y-2">
            <Input 
              placeholder="6-digit code" 
              value={code} 
              onChange={e => setCode(e.target.value.slice(0, 6))}
              className="text-center text-2xl tracking-widest h-16 uppercase bg-input border-muted"
            />
          </div>
          <Button type="submit" className="w-full h-14 text-lg neon-primary bg-primary" disabled={code.length !== 6}>
            Enter Room
          </Button>
        </form>
      </div>
    </div>
  );
}