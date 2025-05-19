import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import NewFolderModal from "./new-folder";

interface SavePlayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (folderId: number) => void;
  playName: string;
  setPlayName: (name: string) => void;
}

export default function SavePlayModal({ 
  isOpen, 
  onClose, 
  onSave,
  playName,
  setPlayName
}: SavePlayModalProps) {
  const [selectedFolderId, setSelectedFolderId] = useState<string>("");
  const [newFolderModalOpen, setNewFolderModalOpen] = useState(false);
  const { toast } = useToast();

  // Fetch folders
  const { data: folders, isLoading } = useQuery({
    queryKey: ['/api/folders'],
  });

  // Set first folder as default when data loads
  useEffect(() => {
    if (folders && folders.length > 0 && !selectedFolderId) {
      setSelectedFolderId(folders[0].id.toString());
    }
  }, [folders]);

  const handleSave = () => {
    if (!playName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a play name",
        variant: "destructive"
      });
      return;
    }

    if (!selectedFolderId) {
      toast({
        title: "Error",
        description: "Please select a folder",
        variant: "destructive"
      });
      return;
    }

    onSave(parseInt(selectedFolderId));
  };

  const handleNewFolderCreated = (newFolderId: number) => {
    setSelectedFolderId(newFolderId.toString());
    setNewFolderModalOpen(false);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Save Play</DialogTitle>
            <DialogDescription>
              Enter a name for your play and select a folder to save it in.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="playName" className="text-right">
                Play Name
              </Label>
              <Input
                id="playName"
                value={playName}
                onChange={(e) => setPlayName(e.target.value)}
                className="col-span-3"
                placeholder="Enter play name"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="folder" className="text-right">
                Folder
              </Label>
              <div className="col-span-3 flex gap-2">
                <Select
                  value={selectedFolderId}
                  onValueChange={setSelectedFolderId}
                  disabled={isLoading}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a folder" />
                  </SelectTrigger>
                  <SelectContent>
                    {folders?.map((folder: any) => (
                      <SelectItem key={folder.id} value={folder.id.toString()}>
                        {folder.name}
                      </SelectItem>
                    ))}
                    <SelectItem value="new" onClick={() => setNewFolderModalOpen(true)}>
                      + Create New Folder
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700">
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Folder Modal */}
      <NewFolderModal
        isOpen={newFolderModalOpen}
        onClose={() => setNewFolderModalOpen(false)}
        onFolderCreated={handleNewFolderCreated}
      />
    </>
  );
}
