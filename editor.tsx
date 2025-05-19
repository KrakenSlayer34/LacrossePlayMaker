import { useParams, useLocation } from "wouter";
import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { CanvasElement, Play } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import Field from "@/components/canvas/field";
import SavePlayModal from "@/components/modals/save-play";
import { useCanvasState } from "@/hooks/use-canvas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Save, ZoomIn, ZoomOut, Maximize, Undo2, Redo2, PlayCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export default function Editor() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const [playName, setPlayName] = useState("Untitled Play");
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const { toast } = useToast();

  // Canvas state using our custom hook
  const canvasState = useCanvasState();

  // Fetch play data if we have an ID
  const { data: playData, isLoading } = useQuery<Play>({
    queryKey: ['/api/plays', id],
    enabled: !!id,
  });

  // Update play mutation
  const updatePlayMutation = useMutation({
    mutationFn: async (updatedPlay: Partial<Play>) => {
      return apiRequest("PUT", `/api/plays/${id}`, updatedPlay);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/plays', id] });
      queryClient.invalidateQueries({ queryKey: ['/api/plays/recent'] });
      setLastSaved(new Date());
      toast({
        title: "Success",
        description: "Play saved successfully",
      });
    }
  });

  // Create play mutation
  const createPlayMutation = useMutation({
    mutationFn: async (newPlay: { name: string; folderId: number; canvas: CanvasElement[] }) => {
      return apiRequest("POST", "/api/plays", newPlay);
    },
    onSuccess: (response) => {
      response.json().then((data) => {
        queryClient.invalidateQueries({ queryKey: ['/api/plays/recent'] });
        navigate(`/editor/${data.id}`);
        setLastSaved(new Date());
        toast({
          title: "Success",
          description: "Play created successfully",
        });
      });
    }
  });

  // Load play data when available
  useEffect(() => {
    if (playData) {
      setPlayName(playData.name);
      canvasState.setElements(playData.canvas as CanvasElement[]);
      setLastSaved(new Date(playData.updatedAt));
    }
  }, [playData]);

  // Save current play
  const handleSave = () => {
    if (id) {
      updatePlayMutation.mutate({
        name: playName,
        canvas: canvasState.elements
      });
    } else {
      setSaveModalOpen(true);
    }
  };

  // Handle zoom controls
  const handleZoomIn = () => {
    setZoomLevel(Math.min(zoomLevel + 10, 150));
  };

  const handleZoomOut = () => {
    setZoomLevel(Math.max(zoomLevel - 10, 50));
  };

  const handleResetZoom = () => {
    setZoomLevel(100);
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header />
      
      <div className="flex-1 flex overflow-hidden">
        <Sidebar canvasState={canvasState} />
        
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Toolbar */}
          <div className="bg-gray-200 p-2 flex justify-between items-center border-b border-gray-300">
            <div className="flex items-center space-x-2">
              <Input 
                type="text" 
                value={playName}
                onChange={(e) => setPlayName(e.target.value)}
                className="w-64"
              />
              <div className="text-sm text-gray-500">
                {lastSaved 
                  ? `Last saved: ${formatDistanceToNow(lastSaved, { addSuffix: true })}` 
                  : "Never saved"}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex items-center mr-4">
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={canvasState.undoAction}
                  disabled={canvasState.history.past.length === 0}
                  className="h-8 w-8"
                >
                  <Undo2 className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={canvasState.redoAction}
                  disabled={canvasState.history.future.length === 0}
                  className="h-8 w-8 ml-1"
                >
                  <Redo2 className="h-4 w-4" />
                </Button>
                <Button 
                  variant={canvasState.isShowingAnimation ? "default" : "outline"}
                  onClick={canvasState.toggleAnimation}
                  className={canvasState.isShowingAnimation ? "ml-1 bg-amber-500 hover:bg-amber-600 h-8" : "ml-1 h-8"}
                >
                  <PlayCircle className="h-4 w-4 mr-1" />
                  {canvasState.isShowingAnimation ? "Stop" : "Play"}
                </Button>
              </div>
              <Button 
                variant="outline" 
                size="icon" 
                onClick={handleZoomOut}
                disabled={zoomLevel <= 50}
                className="h-8 w-8"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-sm">{zoomLevel}%</span>
              <Button 
                variant="outline" 
                size="icon" 
                onClick={handleZoomIn}
                disabled={zoomLevel >= 150}
                className="h-8 w-8"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline" 
                size="icon"
                onClick={handleResetZoom}
                className="h-8 w-8"
              >
                <Maximize className="h-4 w-4" />
              </Button>
              <Button
                onClick={handleSave}
                className="ml-2 bg-green-600 hover:bg-green-700"
              >
                <Save className="mr-2 h-4 w-4" />
                Save
              </Button>
            </div>
          </div>

          {/* Canvas Container with animation frame */}
          <div className="flex-1 overflow-auto bg-gray-100 relative">
            <div className="absolute inset-0 flex items-center justify-center">
              {canvasState.isShowingAnimation ? (
                <div style={{ zoom: `${zoomLevel}%` }}>
                  <Field
                    canvasState={{
                      ...canvasState,
                      elements: canvasState.getAnimatedElements(canvasState.animationProgress)
                    }}
                  />
                </div>
              ) : (
                <div style={{ zoom: `${zoomLevel}%` }}>
                  <Field
                    canvasState={canvasState}
                  />
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Save Play Modal */}
      <SavePlayModal
        isOpen={saveModalOpen}
        onClose={() => setSaveModalOpen(false)}
        onSave={(folderId) => {
          createPlayMutation.mutate({
            name: playName,
            folderId,
            canvas: canvasState.elements
          });
          setSaveModalOpen(false);
        }}
        playName={playName}
        setPlayName={setPlayName}
      />
    </div>
  );
}