import { useState } from 'react';
import { Folder, Plus, FileText, Undo2, Redo2, PlayCircle, Pause } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from '@/lib/utils';
import { useCanvasState } from '@/hooks/use-canvas';
import NewFolderModal from './modals/new-folder';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';

// Tool definitions for better type safety
const tools = [
  { id: 'select', name: 'Select', icon: '👆' },
  { id: 'player', name: 'Player', icon: '👤' },
  { id: 'ball', name: 'Ball', icon: '⚾' },
  { id: 'moveArrow', name: 'Move', icon: '➡️' },
  { id: 'passArrow', name: 'Pass', icon: '↗️' },
  { id: 'shootArrow', name: 'Shoot', icon: '🎯' },
  { id: 'text', name: 'Text', icon: 'T' },
  { id: 'eraser', name: 'Erase', icon: '🧹' },
  { id: 'clear', name: 'Clear', icon: '🗑️' },
] as const;

type ToolId = typeof tools[number]['id'];

interface SidebarProps {
  canvasState: ReturnType<typeof useCanvasState>;
}

export default function Sidebar({ canvasState }: SidebarProps) {
  const [selectedTool, setSelectedTool] = useState<ToolId>('select');
  const [newFolderModalOpen, setNewFolderModalOpen] = useState(false);
  const [customPosition, setCustomPosition] = useState('');
  const [activeTeam, setActiveTeam] = useState<'blue' | 'red' | 'both'>('both');
  const [animationProgress, setAnimationProgress] = useState(0);

  // Fetch folders
  const { data: folders, isLoading: isFoldersLoading } = useQuery({
    queryKey: ['/api/folders'],
  });

  // Fetch recent plays
  const { data: recentPlays, isLoading: isPlaysLoading } = useQuery({
    queryKey: ['/api/plays/recent'],
  });

  const handleToolClick = (toolId: ToolId) => {
    setSelectedTool(toolId);
    canvasState.setCurrentTool(toolId);
    
    // Special case for clear tool
    if (toolId === 'clear') {
      if (confirm('Are you sure you want to clear the canvas?')) {
        canvasState.clearElements();
      }
      // Reset to select tool after clearing
      setSelectedTool('select');
      canvasState.setCurrentTool('select');
    }
  };

  const handleUndo = () => {
    canvasState.undoAction();
  };

  const handleRedo = () => {
    canvasState.redoAction();
  };

  const handleToggleAnimation = () => {
    canvasState.toggleAnimation();
    
    // Reset animation progress when toggling animation
    if (!canvasState.isShowingAnimation) {
      setAnimationProgress(0);
    }
  };

  return (
    <aside className="w-64 bg-gray-50 border-r border-gray-300 flex flex-col h-full overflow-hidden">
      {/* Player Controls Section */}
      <div className="p-4 border-b border-gray-300">
        <h2 className="text-lg font-semibold mb-3">Player Setup</h2>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="team-select">Active Team</Label>
            <Select 
              value={activeTeam}
              onValueChange={(value) => setActiveTeam(value as 'blue' | 'red' | 'both')}
            >
              <SelectTrigger id="team-select">
                <SelectValue placeholder="Select team" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="blue">Blue Team</SelectItem>
                <SelectItem value="red">Red Team</SelectItem>
                <SelectItem value="both">Both Teams</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="position-input">Custom Position</Label>
            <Input
              id="position-input"
              value={customPosition}
              onChange={(e) => setCustomPosition(e.target.value)}
              placeholder="Enter position label (A, M, D, etc.)"
              maxLength={3}
            />
          </div>
        </div>
      </div>
      
      {/* Tools Section */}
      <div className="p-4 border-b border-gray-300">
        <h2 className="text-lg font-semibold mb-3">Tools</h2>
        <div className="grid grid-cols-3 gap-2">
          {tools.map((tool) => (
            <TooltipProvider key={tool.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-12 flex flex-col items-center justify-center gap-1 p-2",
                      selectedTool === tool.id && "bg-green-600 text-white hover:bg-green-700 hover:text-white"
                    )}
                    onClick={() => handleToolClick(tool.id)}
                  >
                    <span className="text-lg">{tool.icon}</span>
                    <span className="text-xs">{tool.name}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{tool.name}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>
      </div>
      
      {/* History controls */}
      <div className="p-4 border-b border-gray-300">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold">Actions</h2>
        </div>
        
        <div className="flex gap-2 mb-4">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleUndo}
                  disabled={canvasState.history.past.length === 0}
                >
                  <Undo2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Undo</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline" 
                  size="icon"
                  onClick={handleRedo}
                  disabled={canvasState.history.future.length === 0}
                >
                  <Redo2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Redo</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={canvasState.isShowingAnimation ? "default" : "outline"}
                  onClick={handleToggleAnimation}
                  className={canvasState.isShowingAnimation ? "bg-amber-500 hover:bg-amber-600" : ""}
                >
                  {canvasState.isShowingAnimation ? (
                    <><Pause className="h-4 w-4 mr-1" /> Stop</>
                  ) : (
                    <><PlayCircle className="h-4 w-4 mr-1" /> Play</>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{canvasState.isShowingAnimation ? "Stop Animation" : "Play Animation"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        
        {/* Animation progress slider - only show when animation is active */}
        {canvasState.isShowingAnimation && (
          <div className="mt-2">
            <Label htmlFor="animation-progress" className="text-xs">
              Animation Progress
            </Label>
            <Slider
              id="animation-progress"
              value={[animationProgress]} 
              min={0}
              max={100}
              step={1}
              onValueChange={(values) => {
                const progress = values[0];
                setAnimationProgress(progress);
                canvasState.setAnimationProgress(progress);
              }}
            />
          </div>
        )}
      </div>

      {/* Folders Section */}
      <div className="p-4 border-b border-gray-300">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold">Folders</h2>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0 text-green-600 hover:text-green-700"
            onClick={() => setNewFolderModalOpen(true)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="space-y-2">
          {isFoldersLoading ? (
            <>
              <div className="h-10 bg-gray-200 animate-pulse rounded-md"></div>
              <div className="h-10 bg-gray-200 animate-pulse rounded-md"></div>
            </>
          ) : (
            folders?.map((folder: any) => (
              <div 
                key={folder.id}
                className="bg-white p-2 rounded-md shadow-sm hover:bg-gray-100 cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Folder className="h-4 w-4 text-yellow-500 mr-2" />
                    <span className="truncate text-sm">{folder.name}</span>
                  </div>
                  <span className="text-gray-500 text-xs">{folder.playCount}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Recently Edited Section */}
      <div className="flex-1 p-4 overflow-y-auto">
        <h2 className="text-lg font-semibold mb-3">Recently Edited</h2>
        
        <div className="space-y-3">
          {isPlaysLoading ? (
            <>
              <div className="h-16 bg-gray-200 animate-pulse rounded-md"></div>
              <div className="h-16 bg-gray-200 animate-pulse rounded-md"></div>
            </>
          ) : (
            recentPlays?.map((play: any) => (
              <div 
                key={play.id}
                className="bg-white p-2 rounded-md shadow-sm hover:bg-gray-100 cursor-pointer"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium truncate text-sm">{play.name}</span>
                  <div className="text-xs text-gray-500">
                    {format(new Date(play.updatedAt), 'MMM d')}
                  </div>
                </div>
                <div className="flex items-center text-xs text-gray-500">
                  <Folder className="h-3 w-3 text-yellow-500 mr-1" />
                  <span>{play.folderName}</span>
                </div>
              </div>
            ))
          )}
          
          {recentPlays?.length === 0 && !isPlaysLoading && (
            <div className="text-center text-gray-500 text-sm p-4">
              <FileText className="h-12 w-12 mx-auto text-gray-400 mb-2" />
              <p>No plays saved yet</p>
            </div>
          )}
        </div>
      </div>

      {/* New Folder Modal */}
      <NewFolderModal 
        isOpen={newFolderModalOpen}
        onClose={() => setNewFolderModalOpen(false)}
      />
    </aside>
  );
}