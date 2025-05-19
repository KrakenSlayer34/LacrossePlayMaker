import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Undo2, Redo2, Save, PlayCircle, Pause } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Types
type FieldElement = {
  id: string;
  type: 'player' | 'ball' | 'moveArrow' | 'passArrow' | 'shootArrow' | 'text';
  x: number;
  y: number;
  position?: string;
  team?: 'blue' | 'red';
  text?: string;
  points?: number[];
};

type Tool = 'select' | 'player' | 'ball' | 'moveArrow' | 'passArrow' | 'shootArrow' | 'text' | 'eraser';

const LacrosseField = () => {
  // State
  const [elements, setElements] = useState<FieldElement[]>([]);
  const [history, setHistory] = useState<{past: FieldElement[][], present: FieldElement[], future: FieldElement[][]}>({
    past: [],
    present: [],
    future: []
  });
  const [selectedTool, setSelectedTool] = useState<Tool>('select');
  const [activeTeam, setActiveTeam] = useState<'blue' | 'red' | 'both'>('both');
  const [customPosition, setCustomPosition] = useState('X');
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<{x: number, y: number} | null>(null);
  const [dragging, setDragging] = useState<{id: string, offsetX: number, offsetY: number} | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationProgress, setAnimationProgress] = useState(0);
  const [playName, setPlayName] = useState('Untitled Play');
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  
  const svgRef = useRef<SVGSVGElement>(null);
  const { toast } = useToast();
  
  // Load elements from localStorage on initial render
  useEffect(() => {
    const savedData = localStorage.getItem('lacrossePlay');
    if (savedData) {
      try {
        const { elements, playName } = JSON.parse(savedData);
        if (elements && Array.isArray(elements)) {
          setElements(elements);
          setHistory({
            past: [],
            present: elements,
            future: []
          });
        }
        if (playName) {
          setPlayName(playName);
        }
        toast({
          title: "Play loaded",
          description: "Successfully loaded saved play from local storage"
        });
      } catch (error) {
        console.error('Error loading data:', error);
      }
    } else {
      // Create default players if no saved data
      createDefaultPlayers();
    }
  }, []);
  
  // Create default players
  const createDefaultPlayers = () => {
    const defaultPlayers: FieldElement[] = [
      // Blue team (offense)
      { id: 'p1', type: 'player', x: 180, y: 150, position: 'A', team: 'blue' },
      { id: 'p2', type: 'player', x: 120, y: 200, position: 'A', team: 'blue' },
      { id: 'p3', type: 'player', x: 240, y: 200, position: 'A', team: 'blue' },
      { id: 'p4', type: 'player', x: 180, y: 250, position: 'M', team: 'blue' },
      { id: 'p5', type: 'player', x: 120, y: 300, position: 'M', team: 'blue' },
      { id: 'p6', type: 'player', x: 240, y: 300, position: 'M', team: 'blue' },
      { id: 'p7', type: 'player', x: 150, y: 400, position: 'D', team: 'blue' },
      { id: 'p8', type: 'player', x: 210, y: 400, position: 'D', team: 'blue' },
      { id: 'p9', type: 'player', x: 180, y: 450, position: 'D', team: 'blue' },
      { id: 'p10', type: 'player', x: 180, y: 500, position: 'G', team: 'blue' },
      
      // Red team (defense)
      { id: 'p11', type: 'player', x: 180, y: 100, position: 'A', team: 'red' },
      { id: 'p12', type: 'player', x: 120, y: 150, position: 'A', team: 'red' },
      { id: 'p13', type: 'player', x: 240, y: 150, position: 'A', team: 'red' },
      { id: 'p14', type: 'player', x: 180, y: 200, position: 'M', team: 'red' },
      { id: 'p15', type: 'player', x: 120, y: 250, position: 'M', team: 'red' },
      { id: 'p16', type: 'player', x: 240, y: 250, position: 'M', team: 'red' },
      { id: 'p17', type: 'player', x: 150, y: 350, position: 'D', team: 'red' },
      { id: 'p18', type: 'player', x: 210, y: 350, position: 'D', team: 'red' },
      { id: 'p19', type: 'player', x: 180, y: 400, position: 'D', team: 'red' },
      { id: 'p20', type: 'player', x: 180, y: 450, position: 'G', team: 'red' },
    ];
    
    setElements(defaultPlayers);
    setHistory({
      past: [],
      present: defaultPlayers,
      future: []
    });
  };
  
  // Generate unique ID
  const generateId = () => {
    return Math.random().toString(36).substring(2, 9);
  };
  
  // Add element with history
  const addElement = (element: FieldElement) => {
    setHistory(prev => ({
      past: [...prev.past, prev.present],
      present: [...prev.present, element],
      future: []
    }));
    setElements(prev => [...prev, element]);
  };
  
  // Update element with history
  const updateElement = (id: string, changes: Partial<FieldElement>) => {
    setHistory(prev => ({
      past: [...prev.past, prev.present],
      present: prev.present.map(el => el.id === id ? { ...el, ...changes } : el),
      future: []
    }));
    setElements(prev => prev.map(el => el.id === id ? { ...el, ...changes } : el));
  };
  
  // Remove element with history
  const removeElement = (id: string) => {
    setHistory(prev => ({
      past: [...prev.past, prev.present],
      present: prev.present.filter(el => el.id !== id),
      future: []
    }));
    setElements(prev => prev.filter(el => el.id !== id));
  };
  
  // Undo action
  const undo = () => {
    setHistory(prev => {
      if (prev.past.length === 0) return prev;
      
      const newPast = [...prev.past];
      const newPresent = newPast.pop() || [];
      
      setElements(newPresent);
      
      return {
        past: newPast,
        present: newPresent,
        future: [prev.present, ...prev.future]
      };
    });
  };
  
  // Redo action
  const redo = () => {
    setHistory(prev => {
      if (prev.future.length === 0) return prev;
      
      const newFuture = [...prev.future];
      const newPresent = newFuture.shift() || [];
      
      setElements(newPresent);
      
      return {
        past: [...prev.past, prev.present],
        present: newPresent,
        future: newFuture
      };
    });
  };
  
  // Save play to localStorage
  const savePlay = () => {
    localStorage.setItem('lacrossePlay', JSON.stringify({
      elements,
      playName
    }));
    
    toast({
      title: "Play saved",
      description: "Successfully saved play to local storage"
    });
  };
  
  // Get mouse position relative to SVG
  const getMousePosition = (event: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    
    const CTM = svgRef.current.getScreenCTM();
    if (!CTM) return { x: 0, y: 0 };
    
    return {
      x: (event.clientX - CTM.e) / CTM.a,
      y: (event.clientY - CTM.f) / CTM.d
    };
  };
  
  // Handle mouse down
  const handleMouseDown = (event: React.MouseEvent<SVGSVGElement>) => {
    if (event.button !== 0) return; // Only handle left click
    
    const pos = getMousePosition(event);
    
    if (selectedTool === 'select') {
      // Check if clicked on an element
      const clickedElement = elements.findLast(el => isPointInElement(pos.x, pos.y, el));
      
      if (clickedElement) {
        setSelectedElementId(clickedElement.id);
        setDragging({
          id: clickedElement.id,
          offsetX: pos.x - clickedElement.x,
          offsetY: pos.y - clickedElement.y
        });
      } else {
        setSelectedElementId(null);
      }
    } else if (selectedTool === 'eraser') {
      // Check if clicked on an element to erase
      const elementToErase = elements.find(el => isPointInElement(pos.x, pos.y, el));
      if (elementToErase) {
        removeElement(elementToErase.id);
      }
    } else if (['moveArrow', 'passArrow', 'shootArrow'].includes(selectedTool)) {
      // Start drawing arrow
      setIsDrawing(true);
      setStartPoint(pos);
    } else if (selectedTool === 'player') {
      // Add new player
      addElement({
        id: generateId(),
        type: 'player',
        x: pos.x,
        y: pos.y,
        position: customPosition || 'X',
        team: 'blue'
      });
    } else if (selectedTool === 'ball') {
      // Add new ball
      addElement({
        id: generateId(),
        type: 'ball',
        x: pos.x,
        y: pos.y
      });
    } else if (selectedTool === 'text') {
      // Add new text
      const text = prompt('Enter text:');
      if (text) {
        addElement({
          id: generateId(),
          type: 'text',
          x: pos.x,
          y: pos.y,
          text
        });
      }
    }
  };
  
  // Handle mouse move
  const handleMouseMove = (event: React.MouseEvent<SVGSVGElement>) => {
    const pos = getMousePosition(event);
    
    if (dragging) {
      // Move the dragged element
      updateElement(dragging.id, {
        x: pos.x - dragging.offsetX,
        y: pos.y - dragging.offsetY
      });
    } else if (isDrawing && startPoint) {
      // Draw arrow
      const tempElement = elements.find(el => el.id === 'tempArrow');
      
      const arrowData = {
        id: 'tempArrow',
        type: selectedTool as any,
        x: startPoint.x,
        y: startPoint.y,
        points: [startPoint.x, startPoint.y, pos.x, pos.y]
      };
      
      if (tempElement) {
        updateElement('tempArrow', arrowData);
      } else {
        addElement(arrowData);
      }
    }
  };
  
  // Handle mouse up
  const handleMouseUp = (event: React.MouseEvent<SVGSVGElement>) => {
    if (isDrawing && startPoint) {
      const pos = getMousePosition(event);
      
      // Remove temporary arrow
      removeElement('tempArrow');
      
      // Only add arrow if it has some length
      if (Math.abs(startPoint.x - pos.x) > 5 || Math.abs(startPoint.y - pos.y) > 5) {
        addElement({
          id: generateId(),
          type: selectedTool as any,
          x: startPoint.x,
          y: startPoint.y,
          points: [startPoint.x, startPoint.y, pos.x, pos.y]
        });
      }
      
      setIsDrawing(false);
      setStartPoint(null);
    }
    
    setDragging(null);
  };
  
  // Toggle animation
  const toggleAnimation = () => {
    setIsAnimating(!isAnimating);
    setAnimationProgress(0);
  };
  
  // Check if point is inside an element
  const isPointInElement = (x: number, y: number, element: FieldElement): boolean => {
    if (element.type === 'player' || element.type === 'ball') {
      const radius = element.type === 'player' ? 15 : 8;
      return Math.sqrt(Math.pow(x - element.x, 2) + Math.pow(y - element.y, 2)) <= radius;
    } else if (element.type === 'text') {
      // Simple rectangular hit test for text
      return x >= element.x && x <= element.x + 80 && y >= element.y - 10 && y <= element.y + 10;
    } else if (['moveArrow', 'passArrow', 'shootArrow'].includes(element.type) && element.points) {
      // Check if point is near the arrow line
      const [x1, y1, x2, y2] = element.points;
      
      // Calculate distance from point to line segment
      const lineLength = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
      if (lineLength === 0) return false;
      
      const t = ((x - x1) * (x2 - x1) + (y - y1) * (y2 - y1)) / (lineLength * lineLength);
      if (t < 0) return false;
      if (t > 1) return false;
      
      const projX = x1 + t * (x2 - x1);
      const projY = y1 + t * (y2 - y1);
      
      const distance = Math.sqrt(Math.pow(x - projX, 2) + Math.pow(y - projY, 2));
      return distance <= 10;
    }
    
    return false;
  };
  
  // Get animated elements based on progress (0-100)
  const getAnimatedElements = () => {
    if (!isAnimating) return elements;
    
    // Clone elements to avoid modifying originals
    const animatedElements = JSON.parse(JSON.stringify(elements));
    
    // For simplicity, only animate players along arrows
    const arrowElements = animatedElements.filter(
      (el: FieldElement) => ['moveArrow', 'passArrow', 'shootArrow'].includes(el.type)
    );
    
    // Calculate intermediate positions for players based on arrows
    arrowElements.forEach((arrow: FieldElement) => {
      if (!arrow.points || arrow.points.length < 4) return;
      
      // Find players at start of arrow
      const playerAtStart = animatedElements.find(
        (el: FieldElement) => 
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
        
        playerAtStart.x = startX + ((endX - startX) * animationProgress / 100);
        playerAtStart.y = startY + ((endY - startY) * animationProgress / 100);
      }
    });
    
    return animatedElements;
  };
  
  // Field dimensions
  const FIELD_WIDTH = 360;
  const FIELD_HEIGHT = 600;
  
  // Tools configuration
  const tools = [
    { id: 'select', name: 'Select', icon: '👆' },
    { id: 'player', name: 'Player', icon: '👤' },
    { id: 'ball', name: 'Ball', icon: '⚾' },
    { id: 'moveArrow', name: 'Move', icon: '➡️' },
    { id: 'passArrow', name: 'Pass', icon: '↗️' },
    { id: 'shootArrow', name: 'Shoot', icon: '🎯' },
    { id: 'text', name: 'Text', icon: 'T' },
    { id: 'eraser', name: 'Erase', icon: '🧹' }
  ];
  
  // Get visible elements based on activeTeam setting
  const visibleElements = elements.filter(element => {
    if (element.type !== 'player') return true;
    if (activeTeam === 'both') return true;
    return element.team === activeTeam;
  });
  
  // Render the actual elements (players, arrows, etc.)
  const renderElements = (elementList: FieldElement[]) => {
    return elementList.map(element => {
      if (element.type === 'player') {
        // Render player
        const fillColor = element.team === 'blue' ? '#3498DB' : '#E74C3C';
        
        return (
          <g key={element.id} className={selectedElementId === element.id ? 'selected-element' : ''}>
            <circle 
              cx={element.x} 
              cy={element.y} 
              r="15" 
              fill={fillColor} 
              stroke="white" 
              strokeWidth="2" 
            />
            <text 
              x={element.x} 
              y={element.y} 
              fontSize="12" 
              fill="white" 
              fontWeight="bold" 
              textAnchor="middle" 
              dominantBaseline="middle"
            >
              {element.position}
            </text>
          </g>
        );
      } else if (element.type === 'ball') {
        // Render ball
        return (
          <g key={element.id} className={selectedElementId === element.id ? 'selected-element' : ''}>
            <circle 
              cx={element.x} 
              cy={element.y} 
              r="8" 
              fill="white" 
              stroke="black" 
              strokeWidth="1" 
            />
            <circle 
              cx={element.x} 
              cy={element.y} 
              r="5" 
              fill="black" 
            />
          </g>
        );
      } else if (['moveArrow', 'passArrow', 'shootArrow'].includes(element.type) && element.points) {
        // Render arrow
        const [x1, y1, x2, y2] = element.points;
        
        // Set arrow properties based on type
        let stroke = '#000000';
        let strokeWidth = 2;
        let strokeDasharray = 'none';
        
        if (element.type === 'moveArrow') {
          stroke = '#3498DB';
          strokeWidth = 3;
          strokeDasharray = '5,5';
        } else if (element.type === 'passArrow') {
          stroke = '#27AE60';
          strokeWidth = 2;
        } else if (element.type === 'shootArrow') {
          stroke = '#E74C3C';
          strokeWidth = 3;
        }
        
        return (
          <g key={element.id} className={selectedElementId === element.id ? 'selected-element' : ''}>
            <line 
              x1={x1} 
              y1={y1} 
              x2={x2} 
              y2={y2} 
              stroke={stroke}
              strokeWidth={strokeWidth}
              strokeDasharray={strokeDasharray}
              markerEnd="url(#arrowhead)" 
            />
          </g>
        );
      } else if (element.type === 'text') {
        // Render text
        return (
          <text
            key={element.id}
            x={element.x}
            y={element.y}
            fontSize="16"
            fill="white"
            className={selectedElementId === element.id ? 'selected-element' : ''}
          >
            {element.text}
          </text>
        );
      }
      
      return null;
    });
  };
  
  // Render the substitution box outside the field
  const renderSubstitutionBox = () => (
    <g transform="translate(-130, 250)">
      <rect
        width="120"
        height="200"
        fill="white"
        stroke="gray"
        strokeWidth="2"
        rx="5"
        ry="5"
      />
      <text
        x="60"
        y="20"
        fontSize="12"
        fontWeight="bold"
        textAnchor="middle"
      >
        Substitution Box
      </text>
      <line
        x1="0"
        y1="25"
        x2="120"
        y2="25"
        stroke="gray"
        strokeWidth="1"
      />
      
      {/* Default substitute players */}
      <circle cx="30" cy="45" r="15" fill="#3498DB" stroke="white" strokeWidth="2" />
      <text x="30" y="45" fontSize="12" fill="white" textAnchor="middle" dominantBaseline="middle">A</text>
      
      <circle cx="80" cy="45" r="15" fill="#3498DB" stroke="white" strokeWidth="2" />
      <text x="80" y="45" fontSize="12" fill="white" textAnchor="middle" dominantBaseline="middle">M</text>
      
      <circle cx="30" cy="85" r="15" fill="#3498DB" stroke="white" strokeWidth="2" />
      <text x="30" y="85" fontSize="12" fill="white" textAnchor="middle" dominantBaseline="middle">D</text>
      
      <circle cx="80" cy="85" r="15" fill="#3498DB" stroke="white" strokeWidth="2" />
      <text x="80" y="85" fontSize="12" fill="white" textAnchor="middle" dominantBaseline="middle">G</text>
      
      <circle cx="30" cy="125" r="15" fill="#E74C3C" stroke="white" strokeWidth="2" />
      <text x="30" y="125" fontSize="12" fill="white" textAnchor="middle" dominantBaseline="middle">A</text>
      
      <circle cx="80" cy="125" r="15" fill="#E74C3C" stroke="white" strokeWidth="2" />
      <text x="80" y="125" fontSize="12" fill="white" textAnchor="middle" dominantBaseline="middle">M</text>
      
      <circle cx="30" cy="165" r="15" fill="#E74C3C" stroke="white" strokeWidth="2" />
      <text x="30" y="165" fontSize="12" fill="white" textAnchor="middle" dominantBaseline="middle">D</text>
      
      <circle cx="80" cy="165" r="15" fill="#E74C3C" stroke="white" strokeWidth="2" />
      <text x="80" y="165" fontSize="12" fill="white" textAnchor="middle" dominantBaseline="middle">G</text>
    </g>
  );
  
  return (
    <div className="flex flex-col h-screen">
      <div className="bg-gray-200 p-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Input
            value={playName}
            onChange={(e) => setPlayName(e.target.value)}
            placeholder="Play Name"
            className="w-64"
          />
          <Button onClick={savePlay} className="bg-green-600 hover:bg-green-700">
            <Save className="mr-2 h-4 w-4" />
            Save Play
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="icon"
            onClick={undo}
            disabled={history.past.length === 0}
          >
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button 
            variant="outline" 
            size="icon"
            onClick={redo}
            disabled={history.future.length === 0}
          >
            <Redo2 className="h-4 w-4" />
          </Button>
          <Button 
            variant={isAnimating ? "default" : "outline"}
            onClick={toggleAnimation}
            className={isAnimating ? "bg-amber-500 hover:bg-amber-600" : ""}
          >
            {isAnimating ? (
              <><Pause className="h-4 w-4 mr-1" /> Stop</>
            ) : (
              <><PlayCircle className="h-4 w-4 mr-1" /> Play</>
            )}
          </Button>
        </div>
      </div>
      
      <div className="flex-1 flex overflow-hidden">
        {/* Tools Panel */}
        <div className="w-64 bg-gray-50 border-r border-gray-300 p-4 flex flex-col">
          {/* Team Selection */}
          <div className="mb-4">
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
          
          {/* Custom Position Input */}
          <div className="mb-6">
            <Label htmlFor="position-input">Custom Position</Label>
            <Input
              id="position-input"
              value={customPosition}
              onChange={(e) => setCustomPosition(e.target.value)}
              placeholder="Enter position label (A, M, D, etc.)"
              maxLength={3}
            />
          </div>
          
          {/* Tools */}
          <h3 className="font-semibold mb-2">Tools</h3>
          <div className="grid grid-cols-3 gap-2 mb-6">
            {tools.map(tool => (
              <Button
                key={tool.id}
                variant={selectedTool === tool.id ? "default" : "outline"}
                size="sm"
                className={`h-12 flex flex-col items-center justify-center gap-1 p-2 ${
                  selectedTool === tool.id ? "bg-green-600 text-white hover:bg-green-700" : ""
                }`}
                onClick={() => setSelectedTool(tool.id as Tool)}
              >
                <span className="text-lg">{tool.icon}</span>
                <span className="text-xs">{tool.name}</span>
              </Button>
            ))}
          </div>
          
          {/* Animation Progress */}
          {isAnimating && (
            <div className="mt-auto mb-4">
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
                  setAnimationProgress(values[0]);
                }}
              />
            </div>
          )}
        </div>
        
        {/* Canvas Area */}
        <div className="flex-1 bg-gray-100 overflow-auto flex items-center justify-center">
          <div className="relative">
            <svg
              ref={svgRef}
              width={FIELD_WIDTH}
              height={FIELD_HEIGHT}
              viewBox={`0 0 ${FIELD_WIDTH} ${FIELD_HEIGHT}`}
              className="border border-gray-400 bg-[#2F7A32]"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
            >
              {/* Define arrow marker */}
              <defs>
                <marker
                  id="arrowhead"
                  markerWidth="10"
                  markerHeight="7"
                  refX="10"
                  refY="3.5"
                  orient="auto"
                >
                  <polygon points="0 0, 10 3.5, 0 7" fill="currentColor" />
                </marker>
              </defs>
              
              {/* Field Markings */}
              <line 
                x1="0" y1={FIELD_HEIGHT / 2} 
                x2={FIELD_WIDTH} y2={FIELD_HEIGHT / 2} 
                stroke="white" strokeWidth="2" 
              />
              
              <circle 
                cx={FIELD_WIDTH / 2} cy={FIELD_HEIGHT / 2} 
                r="40" 
                stroke="white" strokeWidth="2" 
                fill="none" 
              />
              
              <rect 
                x={(FIELD_WIDTH - 80) / 2} y="20" 
                width="80" height="20" 
                fill="white" 
                rx="8" ry="8"
              />
              
              <rect 
                x={(FIELD_WIDTH - 80) / 2} y={FIELD_HEIGHT - 40} 
                width="80" height="20" 
                fill="white" 
                rx="8" ry="8"
              />
              
              <circle 
                cx={FIELD_WIDTH / 2} cy="60" 
                r="60" 
                stroke="white" strokeWidth="2" 
                fill="none" 
              />
              
              <circle 
                cx={FIELD_WIDTH / 2} cy={FIELD_HEIGHT - 60} 
                r="60" 
                stroke="white" strokeWidth="2" 
                fill="none" 
              />
              
              <line 
                x1="0" y1={FIELD_HEIGHT / 4} 
                x2={FIELD_WIDTH} y2={FIELD_HEIGHT / 4} 
                stroke="white" strokeWidth="2" 
              />
              
              <line 
                x1="0" y1={(FIELD_HEIGHT / 4) * 3} 
                x2={FIELD_WIDTH} y2={(FIELD_HEIGHT / 4) * 3} 
                stroke="white" strokeWidth="2" 
              />
              
              {/* Substitution Box */}
              {renderSubstitutionBox()}
              
              {/* Render Elements */}
              {renderElements(isAnimating ? getAnimatedElements() : visibleElements)}
            </svg>
          </div>
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{
        __html: `
        .selected-element {
          outline: 2px dashed orange;
          outline-offset: 2px;
        }
        `
      }} />
    </div>
  );
};

export default LacrosseField;