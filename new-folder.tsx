import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
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
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface NewFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFolderCreated?: (folderId: number) => void;
}

export default function NewFolderModal({ 
  isOpen, 
  onClose,
  onFolderCreated
}: NewFolderModalProps) {
  const [folderName, setFolderName] = useState("");
  const { toast } = useToast();

  const createFolderMutation = useMutation({
    mutationFn: async (name: string) => {
      return apiRequest("POST", "/api/folders", { name });
    },
    onSuccess: async (response) => {
      const data = await response.json();
      queryClient.invalidateQueries({ queryKey: ['/api/folders'] });
      setFolderName("");
      toast({
        title: "Success",
        description: "Folder created successfully",
      });
      onClose();
      onFolderCreated?.(data.id);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create folder: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  const handleCreateFolder = () => {
    if (!folderName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a folder name",
        variant: "destructive"
      });
      return;
    }

    createFolderMutation.mutate(folderName);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Folder</DialogTitle>
          <DialogDescription>
            Enter a name for your new folder.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="folderName" className="text-right">
              Folder Name
            </Label>
            <Input
              id="folderName"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              className="col-span-3"
              placeholder="Enter folder name"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreateFolder} 
            className="bg-green-600 hover:bg-green-700"
            disabled={createFolderMutation.isPending}
          >
            {createFolderMutation.isPending ? "Creating..." : "Create Folder"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
