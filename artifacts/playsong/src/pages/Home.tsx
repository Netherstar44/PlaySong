import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useCreateRoom, useGetActiveRooms } from "@workspace/api-client-react";
import { useRoom } from "@/contexts/RoomContext";
import { motion } from "framer-motion";

export default function Home() {
  const [, setLocation] = useLocation();
  const createRoom = useCreateRoom();
  const { data: activeRooms } = useGetActiveRooms();
  const { joinRoom } = useRoom();

  const handleCreate = () => {
    createRoom.mutate(
      { data: { hostNickname: "Host" } },
      {
        onSuccess: (room) => {
          localStorage.setItem("hostToken", room.hostId);
          setLocation(`/host`);
        }
      }
    );
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 bg-background text-foreground relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/20 via-background to-background" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="z-10 text-center max-w-md w-full space-y-8"
      >
        <div>
          <h1 className="text-6xl font-black mb-4 text-primary neon-text-primary tracking-tighter">PlaySong</h1>
          <p className="text-xl text-muted-foreground font-medium">The soul of the party.</p>
        </div>

        <div className="space-y-4">
          <Button 
            size="lg" 
            className="w-full text-lg h-16 neon-primary bg-primary text-primary-foreground font-bold hover:bg-primary/90"
            onClick={handleCreate}
            disabled={createRoom.isPending}
          >
            Crear Sala
          </Button>
          <Button 
            size="lg" 
            variant="outline"
            className="w-full text-lg h-16 border-secondary text-secondary neon-text-secondary hover:bg-secondary/10"
            onClick={() => setLocation("/join")}
          >
            Unirse a Sala
          </Button>
        </div>

        {activeRooms && activeRooms.length > 0 && (
          <div className="pt-8">
            <p className="text-sm text-muted-foreground mb-4">{activeRooms.length} active parties right now!</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}