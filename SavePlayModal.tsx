import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Folder } from "@shared/schema";

interface SavePlayModalProps {
  isOpen: boolean;
  onClose: () => void;
  playName: string;
  canvasData: any;
  onSaveToLocalStorage: () => void;
  onSaveToDatabase: (folderId: number, name: string) => Promise<void>;
  currentUser: { id: number; username: string } | null;
}

export default function SavePlayModal({
  isOpen,
  onClose,
  playName,
  canvasData,
  onSaveToLocalStorage,
  onSaveToDatabase,
  currentUser
}: SavePlayModalProps) {
  const [name, setName] = useState(playName);
  const [saveType, setSaveType] = useState<"local" | "online">("local");
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const { toast } = useToast();
  
  useEffect(() => {
    if (isOpen && currentUser) {
      // Fetch user's folders if user is logged in
      fetchFolders();
    }
  }, [isOpen, currentUser]);
  
  useEffect(() => {
    // Update the play name when it changes externally
    setName(playName);
  }, [playName]);
  
  const fetchFolders = async () => {
    if (!currentUser) return;
    
    try {
      const response = await fetch("/api/folders");
      
      if (!response.ok) {
        throw new Error("Failed to fetch folders");
      }
      
      const data = await response.json();
      setFolders(data);
      
      // Select the first folder by default
      if (data.length > 0 && !selectedFolderId) {
        setSelectedFolderId(data[0].id);
      }
    } catch (error) {
      console.error("Error fetching folders:", error);
      toast({
        title: "Error",
        description: "Failed to fetch folders",
        variant: "destructive",
      });
    }
  };
  
  const createFolder = async () => {
    if (!currentUser || !newFolderName.trim()) return;
    
    setIsLoading(true);
    
    try {
      const response = await fetch("/api/folders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newFolderName.trim(),
        }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to create folder");
      }
      
      const folder = await response.json();
      
      setFolders(prev => [...prev, folder]);
      setSelectedFolderId(folder.id);
      setNewFolderName("");
      setIsCreatingFolder(false);
      
      toast({
        title: "Success",
        description: "Folder created successfully",
      });
    } catch (error) {
      console.error("Error creating folder:", error);
      toast({
        title: "Error",
        description: "Failed to create folder",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        title: "Error",
        description: "Please enter a play name",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      if (saveType === "local") {
        // Save to local storage
        onSaveToLocalStorage();
        toast({
          title: "Success",
          description: "Play saved to local storage",
        });
        onClose();
      } else if (saveType === "online" && selectedFolderId && currentUser) {
        // Save to database
        await onSaveToDatabase(selectedFolderId, name);
        toast({
          title: "Success",
          description: "Play saved to your online account",
        });
        onClose();
      } else {
        throw new Error("Please select a folder to save your play");
      }
    } catch (error) {
      console.error("Error saving play:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save play",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Save Play</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div>
            <label className="block text-sm font-medium mb-1">Play Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter play name"
              className="w-full"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Save Location</label>
            <Select
              value={saveType}
              onValueChange={(value) => setSaveType(value as "local" | "online")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select save location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="local">Local Storage (This Device Only)</SelectItem>
                <SelectItem value="online" disabled={!currentUser}>
                  Online Database {!currentUser && "(Login Required)"}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {saveType === "online" && currentUser && (
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium">Folder</label>
                <button
                  type="button"
                  onClick={() => setIsCreatingFolder(true)}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Create New Folder
                </button>
              </div>
              
              {isCreatingFolder ? (
                <div className="flex gap-2">
                  <Input
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="New folder name"
                    className="flex-1"
                  />
                  <Button
                    size="sm"
                    onClick={createFolder}
                    disabled={isLoading || !newFolderName.trim()}
                  >
                    Create
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setIsCreatingFolder(false);
                      setNewFolderName("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <Select
                  value={selectedFolderId?.toString() || ""}
                  onValueChange={(value) => setSelectedFolderId(Number(value))}
                  disabled={folders.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={folders.length === 0 ? "No folders found" : "Select a folder"} />
                  </SelectTrigger>
                  <SelectContent>
                    {folders.map((folder) => (
                      <SelectItem key={folder.id} value={folder.id.toString()}>
                        {folder.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              
              {folders.length === 0 && !isCreatingFolder && (
                <p className="text-xs text-gray-500 mt-1">
                  You don't have any folders yet. Create one to save your play.
                </p>
              )}
            </div>
          )}
        </div>
        
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? "Saving..." : "Save Play"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}