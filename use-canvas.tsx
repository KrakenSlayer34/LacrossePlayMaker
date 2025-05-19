import { useState, useCallback, useRef } from 'react';
import { CanvasElement } from '@shared/schema';
import { nanoid } from 'nanoid';

type ToolType = 'select' | 'player' | 'ball' | 'moveArrow' | 'passArrow' | 'shootArrow' | 'text' | 'eraser' | 'clear' | 'undo' | 'redo' | 'play';

interface HistoryState {
  past: Array<CanvasElement[]>;
  present: CanvasElement[];
  future: Array<CanvasElement[]>;
}

// Hook for managing canvas state with history for undo/redo
export function useCanvasState() {
  const [history, setHistory] = useState<HistoryState>({
    past: [],
    present: [],
    future: []
  });
  
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [currentTool, setCurrentTool] = useState<ToolType>('select');
  const [isShowingAnimation, setIsShowingAnimation] = useState(false);
  const animationFrameRef = useRef<number | null>(null);
  const [animationProgress, setAnimationProgress] = useState(0);
  
  // Getter for current elements
  const elements = history.present;

  // Set elements with history
  const setElements = useCallback((newElements: CanvasElement[]) => {
    setHistory(prev => ({
      past: [...prev.past, prev.present],
      present: newElements,
      future: []
    }));
  }, []);

  // Add a new element to the canvas
  const addElement = useCallback((element: CanvasElement) => {
    // Ensure element has an ID
    if (!element.id) {
      element.id = nanoid();
    }
    
    setHistory(prev => ({
      past: [...prev.past, prev.present],
      present: [...prev.present, element],
      future: []
    }));
  }, []);

  // Update an existing element with history
  const updateElement = useCallback((id: string, changes: Partial<CanvasElement>) => {
    setHistory(prev => ({
      past: [...prev.past, prev.present],
      present: prev.present.map(el => el.id === id ? { ...el, ...changes } : el),
      future: []
    }));
  }, []);

  // Remove an element with history
  const removeElement = useCallback((id: string) => {
    setHistory(prev => ({
      past: [...prev.past, prev.present],
      present: prev.present.filter(el => el.id !== id),
      future: []
    }));
  }, []);

  // Clear all elements with history
  const clearElements = useCallback(() => {
    setHistory(prev => ({
      past: [...prev.past, prev.present],
      present: [],
      future: []
    }));
  }, []);

  // Undo action
  const undoAction = useCallback(() => {
    setHistory(prev => {
      if (prev.past.length === 0) return prev;
      
      const newPast = [...prev.past];
      const newPresent = newPast.pop() || [];
      
      return {
        past: newPast,
        present: newPresent,
        future: [prev.present, ...prev.future]
      };
    });
  }, []);

  // Redo action
  const redoAction = useCallback(() => {
    setHistory(prev => {
      if (prev.future.length === 0) return prev;
      
      const newFuture = [...prev.future];
      const newPresent = newFuture.shift() || [];
      
      return {
        past: [...prev.past, prev.present],
        present: newPresent,
        future: newFuture
      };
    });
  }, []);

  // Select an element
  const selectElement = useCallback((id: string | null) => {
    setSelectedElement(id);
  }, []);

  // Toggle animation mode
  const toggleAnimation = useCallback(() => {
    setIsShowingAnimation(prev => !prev);
    setAnimationProgress(0);
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  // Get animated elements based on progress (0-100)
  const getAnimatedElements = useCallback((progress: number) => {
    // Clone elements to avoid modifying originals
    const animatedElements = JSON.parse(JSON.stringify(elements));
    
    // For simplicity, we'll just interpolate arrow positions
    // A more sophisticated implementation would trace paths
    const arrowElements = animatedElements.filter(
      (el: CanvasElement) => ['moveArrow', 'passArrow', 'shootArrow'].includes(el.type)
    );
    
    // Calculate intermediate positions for players based on arrows
    arrowElements.forEach((arrow: CanvasElement) => {
      if (!arrow.points || arrow.points.length < 4) return;
      
      // Find players at start of arrow
      const playerAtStart = animatedElements.find(
        (el: CanvasElement) => 
          el.type === 'player' && 
          Math.abs(el.x - arrow.points![0]) < 20 && 
          Math.abs(el.y - arrow.points![1]) < 20
      );
      
      // Move player along the arrow path based on progress
      if (playerAtStart) {
        const startX = arrow.points[0];
        const startY = arrow.points[1];
        const endX = arrow.points[2];
        const endY = arrow.points[3];
        
        playerAtStart.x = startX + ((endX - startX) * progress / 100);
        playerAtStart.y = startY + ((endY - startY) * progress / 100);
      }
    });
    
    return animatedElements;
  }, [elements]);

  return {
    elements,
    setElements,
    selectedElement,
    selectElement,
    currentTool,
    setCurrentTool,
    addElement,
    updateElement,
    removeElement,
    clearElements,
    history,
    undoAction,
    redoAction,
    isShowingAnimation,
    toggleAnimation,
    getAnimatedElements,
    animationProgress,
    setAnimationProgress
  };
}