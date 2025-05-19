import { useState, useRef, useEffect } from 'react';
import Header from "@/components/header";
import SavePlayModal from "@/components/SavePlayModal";
import LoginForm from "@/components/LoginForm";
import { useToast } from "@/hooks/use-toast";

type Player = {
  id: string;
  x: number;
  y: number;
  position: string;
  team: 'blue' | 'red';
};

type Arrow = {
  id: string;
  type: 'move' | 'pass' | 'shoot';
  startX: number;
  startY: number;
  endX: number;
  endY: number;
};

type Ball = {
  id: string;
  x: number;
  y: number;
};

type PlayData = {
  players: Player[];
  arrows: Arrow[];
  balls: Ball[];
  name: string;
};

const LacrossePage = () => {
  // Field dimensions
  const FIELD_WIDTH = 360;
  const FIELD_HEIGHT = 600;
  
  // State
  const [players, setPlayers] = useState<Player[]>([]);
  const [arrows, setArrows] = useState<Arrow[]>([]);
  const [balls, setBalls] = useState<Ball[]>([]);
  const [playName, setPlayName] = useState("Untitled Play");
  const [selectedTool, setSelectedTool] = useState<'select' | 'player' | 'ball' | 'move' | 'pass' | 'shoot' | 'erase'>('select');
  const [activeTeam, setActiveTeam] = useState<'blue' | 'red' | 'both'>('both');
  const [customPosition, setCustomPosition] = useState('X');
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<{x: number, y: number} | null>(null);
  const [selectedElement, setSelectedElement] = useState<{type: string, id: string} | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationProgress, setAnimationProgress] = useState(0);
  const [history, setHistory] = useState<{
    past: PlayData[],
    current: PlayData,
    future: PlayData[]
  }>({
    past: [],
    current: { players: [], arrows: [], balls: [], name: "Untitled Play" },
    future: []
  });
  
  // Authentication and database state
  const [currentUser, setCurrentUser] = useState<{ id: number; username: string } | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  
  const { toast } = useToast();
  
  const svgRef = useRef<SVGSVGElement>(null);
  
  // Initialize with default players
  useEffect(() => {
    const loadFromStorage = localStorage.getItem('lacrossePlay');
    
    if (loadFromStorage) {
      try {
        const data = JSON.parse(loadFromStorage) as PlayData;
        setPlayers(data.players);
        setArrows(data.arrows);
        setBalls(data.balls);
        setPlayName(data.name);
        
        // Update history
        setHistory({
          past: [],
          current: data,
          future: []
        });
      } catch (e) {
        console.error("Failed to load data:", e);
        createDefaultPlayers();
      }
    } else {
      createDefaultPlayers();
    }
  }, []);
  
  // Save current state to history when it changes
  useEffect(() => {
    const currentState = {
      players,
      arrows,
      balls,
      name: playName
    };
    
    setHistory(prev => ({
      ...prev,
      current: currentState
    }));
  }, [players, arrows, balls, playName]);
  
  // Create default players
  const createDefaultPlayers = () => {
    const defaultPlayers: Player[] = [
      // Blue team
      { id: 'p1', x: 180, y: 150, position: 'A', team: 'blue' },
      { id: 'p2', x: 120, y: 200, position: 'A', team: 'blue' },
      { id: 'p3', x: 240, y: 200, position: 'A', team: 'blue' },
      { id: 'p4', x: 180, y: 250, position: 'M', team: 'blue' },
      { id: 'p5', x: 120, y: 300, position: 'M', team: 'blue' },
      { id: 'p6', x: 240, y: 300, position: 'M', team: 'blue' },
      { id: 'p7', x: 150, y: 400, position: 'D', team: 'blue' },
      { id: 'p8', x: 210, y: 400, position: 'D', team: 'blue' },
      { id: 'p9', x: 180, y: 450, position: 'D', team: 'blue' },
      { id: 'p10', x: 180, y: 500, position: 'G', team: 'blue' },
      
      // Red team
      { id: 'p11', x: 180, y: 100, position: 'A', team: 'red' },
      { id: 'p12', x: 120, y: 150, position: 'A', team: 'red' },
      { id: 'p13', x: 240, y: 150, position: 'A', team: 'red' },
      { id: 'p14', x: 180, y: 200, position: 'M', team: 'red' },
      { id: 'p15', x: 120, y: 250, position: 'M', team: 'red' },
      { id: 'p16', x: 240, y: 250, position: 'M', team: 'red' },
      { id: 'p17', x: 150, y: 350, position: 'D', team: 'red' },
      { id: 'p18', x: 210, y: 350, position: 'D', team: 'red' },
      { id: 'p19', x: 180, y: 400, position: 'D', team: 'red' },
      { id: 'p20', x: 180, y: 450, position: 'G', team: 'red' },
    ];
    
    setPlayers(defaultPlayers);
  };
  
  // Generate unique ID
  const generateId = () => {
    return `id_${Math.random().toString(36).substr(2, 9)}`;
  };
  
  // Get mouse position relative to SVG
  const getMousePosition = (event: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    
    const rect = svgRef.current.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  };
  
  // Check if a point is inside a circle (player/ball)
  const isPointInCircle = (x: number, y: number, cx: number, cy: number, radius: number) => {
    return Math.sqrt(Math.pow(x - cx, 2) + Math.pow(y - cy, 2)) <= radius;
  };
  
  // Handle mouse down
  const handleMouseDown = (event: React.MouseEvent<SVGSVGElement>) => {
    const pos = getMousePosition(event);
    
    if (selectedTool === 'select') {
      // Try to select a player first
      const clickedPlayer = players.find(p => isPointInCircle(pos.x, pos.y, p.x, p.y, 15));
      if (clickedPlayer) {
        setSelectedElement({ type: 'player', id: clickedPlayer.id });
        setStartPoint({ x: pos.x - clickedPlayer.x, y: pos.y - clickedPlayer.y }); // For dragging
        return;
      }
      
      // Try to select a ball
      const clickedBall = balls.find(b => isPointInCircle(pos.x, pos.y, b.x, b.y, 8));
      if (clickedBall) {
        setSelectedElement({ type: 'ball', id: clickedBall.id });
        setStartPoint({ x: pos.x - clickedBall.x, y: pos.y - clickedBall.y }); // For dragging
        return;
      }
      
      // Try to select an arrow (simplified - just checking near the start/end points)
      const clickedArrow = arrows.find(a => 
        isPointInCircle(pos.x, pos.y, a.startX, a.startY, 10) || 
        isPointInCircle(pos.x, pos.y, a.endX, a.endY, 10)
      );
      if (clickedArrow) {
        setSelectedElement({ type: 'arrow', id: clickedArrow.id });
        setStartPoint(pos); // For arrow manipulation
        return;
      }
      
      setSelectedElement(null);
    } else if (selectedTool === 'player') {
      // Add a new player
      const newPlayer: Player = {
        id: generateId(),
        x: pos.x,
        y: pos.y,
        position: customPosition,
        team: 'blue'
      };
      
      addToHistory();
      setPlayers(prev => [...prev, newPlayer]);
    } else if (selectedTool === 'ball') {
      // Add a new ball
      const newBall: Ball = {
        id: generateId(),
        x: pos.x,
        y: pos.y
      };
      
      addToHistory();
      setBalls(prev => [...prev, newBall]);
    } else if (['move', 'pass', 'shoot'].includes(selectedTool)) {
      // Start drawing an arrow
      setIsDrawing(true);
      setStartPoint(pos);
    } else if (selectedTool === 'erase') {
      // Erase any element at this position
      const clickedPlayer = players.find(p => isPointInCircle(pos.x, pos.y, p.x, p.y, 15));
      if (clickedPlayer) {
        addToHistory();
        setPlayers(prev => prev.filter(p => p.id !== clickedPlayer.id));
        return;
      }
      
      const clickedBall = balls.find(b => isPointInCircle(pos.x, pos.y, b.x, b.y, 8));
      if (clickedBall) {
        addToHistory();
        setBalls(prev => prev.filter(b => b.id !== clickedBall.id));
        return;
      }
      
      const clickedArrow = arrows.find(a => 
        isPointInCircle(pos.x, pos.y, a.startX, a.startY, 10) || 
        isPointInCircle(pos.x, pos.y, a.endX, a.endY, 10)
      );
      if (clickedArrow) {
        addToHistory();
        setArrows(prev => prev.filter(a => a.id !== clickedArrow.id));
        return;
      }
    }
  };
  
  // Handle mouse move
  const handleMouseMove = (event: React.MouseEvent<SVGSVGElement>) => {
    const pos = getMousePosition(event);
    
    if (selectedTool === 'select' && selectedElement && startPoint) {
      // Move the selected element
      if (selectedElement.type === 'player') {
        setPlayers(prev => prev.map(p => 
          p.id === selectedElement.id 
            ? { ...p, x: pos.x - startPoint.x, y: pos.y - startPoint.y } 
            : p
        ));
      } else if (selectedElement.type === 'ball') {
        setBalls(prev => prev.map(b => 
          b.id === selectedElement.id 
            ? { ...b, x: pos.x - startPoint.x, y: pos.y - startPoint.y } 
            : b
        ));
      } else if (selectedElement.type === 'arrow') {
        // Simple arrow movement (moving the whole arrow)
        const arrow = arrows.find(a => a.id === selectedElement.id);
        if (arrow && startPoint) {
          const dx = pos.x - startPoint.x;
          const dy = pos.y - startPoint.y;
          
          setArrows(prev => prev.map(a => 
            a.id === selectedElement.id 
              ? { 
                  ...a, 
                  startX: a.startX + dx, 
                  startY: a.startY + dy,
                  endX: a.endX + dx,
                  endY: a.endY + dy
                } 
              : a
          ));
          
          setStartPoint(pos);
        }
      }
    } else if (isDrawing && startPoint && ['move', 'pass', 'shoot'].includes(selectedTool)) {
      // Drawing an arrow - we'll update a temporary display arrow
      // Real arrow will be created on mouse up
    }
  };
  
  // Handle mouse up
  const handleMouseUp = (event: React.MouseEvent<SVGSVGElement>) => {
    if (isDrawing && startPoint && ['move', 'pass', 'shoot'].includes(selectedTool)) {
      const pos = getMousePosition(event);
      
      // Create a new arrow if it has some length
      if (Math.abs(startPoint.x - pos.x) > 5 || Math.abs(startPoint.y - pos.y) > 5) {
        const newArrow: Arrow = {
          id: generateId(),
          type: selectedTool as 'move' | 'pass' | 'shoot',
          startX: startPoint.x,
          startY: startPoint.y,
          endX: pos.x,
          endY: pos.y
        };
        
        addToHistory();
        setArrows(prev => [...prev, newArrow]);
      }
    }
    
    // Reset states
    setIsDrawing(false);
    setStartPoint(null);
    
    // If we were dragging something in select mode, add to history
    if (selectedTool === 'select' && selectedElement) {
      addToHistory();
    }
  };
  
  // Toggle animation mode
  const toggleAnimation = () => {
    setIsAnimating(!isAnimating);
    setAnimationProgress(0);
  };
  
  // Get animated elements based on progress (0-100)
  const getAnimatedElements = () => {
    if (!isAnimating) return { players, arrows, balls };
    
    // Clone elements to avoid modifying originals
    const animatedPlayers = JSON.parse(JSON.stringify(players));
    const progress = animationProgress / 100;
    
    // For each arrow, find players near the start and move them along the arrow path
    arrows.forEach(arrow => {
      const playerAtStart = animatedPlayers.find(
        (p: Player) => 
          isPointInCircle(arrow.startX, arrow.startY, p.x, p.y, 20)
      );
      
      if (playerAtStart) {
        playerAtStart.x = arrow.startX + ((arrow.endX - arrow.startX) * progress);
        playerAtStart.y = arrow.startY + ((arrow.endY - arrow.startY) * progress);
      }
    });
    
    return { players: animatedPlayers, arrows, balls };
  };
  
  // Save to localStorage
  const savePlayToLocalStorage = () => {
    const playData: PlayData = {
      players,
      arrows,
      balls,
      name: playName
    };
    
    localStorage.setItem('lacrossePlay', JSON.stringify(playData));
    toast({
      title: "Success",
      description: "Play saved to local storage"
    });
  };
  
  // Save to database
  const savePlayToDatabase = async (folderId: number, name: string) => {
    if (!currentUser) {
      throw new Error("You must be logged in to save plays online");
    }
    
    try {
      const playData = {
        name,
        folderId,
        canvas: {
          players,
          arrows,
          balls
        }
      };
      
      const response = await fetch("/api/plays", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(playData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to save play to database");
      }
      
      setPlayName(name);
      
      return await response.json();
    } catch (error) {
      console.error("Error saving play to database:", error);
      throw error;
    }
  };
  
  // Handle user login
  const handleLoginSuccess = (userId: number, username: string) => {
    setCurrentUser({ id: userId, username });
    setShowLogin(false);
    toast({
      title: "Login successful",
      description: `Welcome back, ${username}!`
    });
  };
  
  // Handle user registration
  const handleRegisterSuccess = (userId: number, username: string) => {
    setCurrentUser({ id: userId, username });
    setShowLogin(false);
    toast({
      title: "Registration successful",
      description: `Welcome, ${username}!`
    });
  };
  
  // Handle user logout
  const handleLogout = async () => {
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST"
      });
      
      if (!response.ok) {
        throw new Error("Failed to log out");
      }
      
      setCurrentUser(null);
      toast({
        title: "Logged out",
        description: "You have been logged out successfully"
      });
    } catch (error) {
      console.error("Error logging out:", error);
      toast({
        title: "Error",
        description: "Failed to log out",
        variant: "destructive"
      });
    }
  };
  
  // Export play to file
  const exportPlay = () => {
    const playData: PlayData = {
      players,
      arrows,
      balls,
      name: playName
    };
    
    // Create a blob with the play data
    const blob = new Blob([JSON.stringify(playData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    // Create a temporary link and trigger download
    const link = document.createElement('a');
    link.href = url;
    link.download = `${playName.replace(/\s+/g, '_')}.json`;
    document.body.appendChild(link);
    link.click();
    
    // Clean up
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  
  // Import play from file
  const importPlay = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content) as PlayData;
        
        // Update state with imported data
        setPlayers(data.players);
        setArrows(data.arrows);
        setBalls(data.balls);
        setPlayName(data.name);
        
        // Update history
        addToHistory();
        
        alert('Play imported successfully!');
      } catch (error) {
        alert('Error importing play file. Please ensure it is a valid play file.');
        console.error(error);
      }
    };
    
    reader.readAsText(file);
    
    // Reset the input value so the same file can be imported again
    event.target.value = '';
  };
  
  // Add current state to history
  const addToHistory = () => {
    setHistory(prev => ({
      past: [...prev.past, prev.current],
      current: { players, arrows, balls, name: playName },
      future: []
    }));
  };
  
  // Undo
  const handleUndo = () => {
    if (history.past.length === 0) return;
    
    const newPast = [...history.past];
    const previous = newPast.pop()!;
    
    setHistory({
      past: newPast,
      current: previous,
      future: [history.current, ...history.future]
    });
    
    setPlayers(previous.players);
    setArrows(previous.arrows);
    setBalls(previous.balls);
    setPlayName(previous.name);
  };
  
  // Redo
  const handleRedo = () => {
    if (history.future.length === 0) return;
    
    const newFuture = [...history.future];
    const next = newFuture.shift()!;
    
    setHistory({
      past: [...history.past, history.current],
      current: next,
      future: newFuture
    });
    
    setPlayers(next.players);
    setArrows(next.arrows);
    setBalls(next.balls);
    setPlayName(next.name);
  };
  
  // Render function
  const renderField = () => {
    // Get elements to display (animated or normal)
    const displayElements = isAnimating ? getAnimatedElements() : { players, arrows, balls };
    
    // Filter players based on team setting
    const visiblePlayers = displayElements.players.filter(player => 
      activeTeam === 'both' || player.team === activeTeam
    );
    
    return (
      <svg 
        ref={svgRef}
        width={FIELD_WIDTH} 
        height={FIELD_HEIGHT} 
        className="border-2 border-gray-400 bg-[#2F7A32]"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        {/* Arrow marker definition */}
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="currentColor" />
          </marker>
        </defs>
        
        {/* Field markings */}
        {/* Center line */}
        <line 
          x1={0} y1={FIELD_HEIGHT / 2} 
          x2={FIELD_WIDTH} y2={FIELD_HEIGHT / 2} 
          stroke="white" strokeWidth={2} 
        />
        
        {/* Center circle */}
        <circle 
          cx={FIELD_WIDTH / 2} cy={FIELD_HEIGHT / 2}
          r={40} stroke="white" strokeWidth={2} fill="none"
        />
        
        {/* Goals - positioned at 1/3 of the way to the top of the circle */}
        <rect
          x={(FIELD_WIDTH - 80) / 2} y={35}
          width={80} height={20}
          fill="white" 
          rx={8} ry={8}
        />
        
        <rect
          x={(FIELD_WIDTH - 80) / 2} y={FIELD_HEIGHT - 80}
          width={80} height={20}
          fill="white" 
          rx={8} ry={8}
        />
        
        {/* Goal circles - smaller */}
        <circle
          cx={FIELD_WIDTH / 2} cy={60}
          r={45} stroke="white" strokeWidth={2} fill="none"
        />
        
        <circle
          cx={FIELD_WIDTH / 2} cy={FIELD_HEIGHT - 60}
          r={45} stroke="white" strokeWidth={2} fill="none"
        />
        
        {/* Restraining lines */}
        <line
          x1={0} y1={FIELD_HEIGHT / 4}
          x2={FIELD_WIDTH} y2={FIELD_HEIGHT / 4}
          stroke="white" strokeWidth={2}
        />
        
        <line
          x1={0} y1={(FIELD_HEIGHT / 4) * 3}
          x2={FIELD_WIDTH} y2={(FIELD_HEIGHT / 4) * 3}
          stroke="white" strokeWidth={2}
        />
        
        {/* Substitution box on left side of field */}
        <g transform="translate(-130, 250)">
          <rect 
            width={120} height={200}
            fill="white" stroke="gray" strokeWidth={2}
            rx={5}
          />
          <text 
            x={60} y={20} 
            fontSize={12} fontWeight="bold" 
            textAnchor="middle"
          >
            Substitution Box
          </text>
          <line 
            x1={0} y1={25} 
            x2={120} y2={25} 
            stroke="gray" strokeWidth={1} 
          />
          
          {/* Substitute players */}
          <circle cx={30} cy={45} r={15} fill="#3498DB" stroke="white" strokeWidth={2} />
          <text x={30} y={45} fontSize={12} fill="white" textAnchor="middle" dominantBaseline="middle">A</text>
          
          <circle cx={80} cy={45} r={15} fill="#3498DB" stroke="white" strokeWidth={2} />
          <text x={80} y={45} fontSize={12} fill="white" textAnchor="middle" dominantBaseline="middle">M</text>
          
          <circle cx={30} cy={85} r={15} fill="#3498DB" stroke="white" strokeWidth={2} />
          <text x={30} y={85} fontSize={12} fill="white" textAnchor="middle" dominantBaseline="middle">D</text>
          
          <circle cx={80} cy={85} r={15} fill="#3498DB" stroke="white" strokeWidth={2} />
          <text x={80} y={85} fontSize={12} fill="white" textAnchor="middle" dominantBaseline="middle">G</text>
          
          <circle cx={30} cy={125} r={15} fill="#E74C3C" stroke="white" strokeWidth={2} />
          <text x={30} y={125} fontSize={12} fill="white" textAnchor="middle" dominantBaseline="middle">A</text>
          
          <circle cx={80} cy={125} r={15} fill="#E74C3C" stroke="white" strokeWidth={2} />
          <text x={80} y={125} fontSize={12} fill="white" textAnchor="middle" dominantBaseline="middle">M</text>
          
          <circle cx={30} cy={165} r={15} fill="#E74C3C" stroke="white" strokeWidth={2} />
          <text x={30} y={165} fontSize={12} fill="white" textAnchor="middle" dominantBaseline="middle">D</text>
          
          <circle cx={80} cy={165} r={15} fill="#E74C3C" stroke="white" strokeWidth={2} />
          <text x={80} y={165} fontSize={12} fill="white" textAnchor="middle" dominantBaseline="middle">G</text>
        </g>
        
        {/* Draw arrows */}
        {displayElements.arrows.map(arrow => {
          // Set arrow style based on type
          const stroke = arrow.type === 'move' ? '#3498DB' : 
                        arrow.type === 'pass' ? '#27AE60' : '#E74C3C';
          const strokeWidth = arrow.type === 'pass' ? 2 : 3;
          const dashArray = arrow.type === 'move' ? '5,5' : 'none';
          
          return (
            <line
              key={arrow.id}
              x1={arrow.startX}
              y1={arrow.startY}
              x2={arrow.endX}
              y2={arrow.endY}
              stroke={stroke}
              strokeWidth={strokeWidth}
              strokeDasharray={dashArray}
              markerEnd="url(#arrowhead)"
              className={selectedElement?.id === arrow.id ? 'stroke-[orange]' : ''}
            />
          );
        })}
        
        {/* Draw temporary arrow when drawing */}
        {isDrawing && startPoint && ['move', 'pass', 'shoot'].includes(selectedTool) && (
          <line
            x1={startPoint.x}
            y1={startPoint.y}
            x2={getMousePosition({ clientX: 0, clientY: 0 } as any).x}
            y2={getMousePosition({ clientX: 0, clientY: 0 } as any).y}
            stroke={selectedTool === 'move' ? '#3498DB' : 
                   selectedTool === 'pass' ? '#27AE60' : '#E74C3C'}
            strokeWidth={selectedTool === 'pass' ? 2 : 3}
            strokeDasharray={selectedTool === 'move' ? '5,5' : 'none'}
            markerEnd="url(#arrowhead)"
          />
        )}
        
        {/* Draw balls */}
        {displayElements.balls.map(ball => (
          <g key={ball.id}>
            <circle
              cx={ball.x}
              cy={ball.y}
              r={8}
              fill="white"
              stroke="black"
              strokeWidth={1}
              className={selectedElement?.id === ball.id ? 'stroke-[orange] stroke-2' : ''}
            />
            <circle
              cx={ball.x}
              cy={ball.y}
              r={5}
              fill="black"
            />
          </g>
        ))}
        
        {/* Draw players */}
        {visiblePlayers.map(player => (
          <g key={player.id}>
            <circle
              cx={player.x}
              cy={player.y}
              r={15}
              fill={player.team === 'blue' ? '#3498DB' : '#E74C3C'}
              stroke="white"
              strokeWidth={2}
              className={selectedElement?.id === player.id ? 'stroke-[orange] stroke-2' : ''}
            />
            <text
              x={player.x}
              y={player.y}
              fontSize={12}
              fill="white"
              fontWeight="bold"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {player.position}
            </text>
          </g>
        ))}
      </svg>
    );
  };
  
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      {/* Login modal */}
      {showLogin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Account Login</h2>
              <button 
                onClick={() => setShowLogin(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <LoginForm 
              onLoginSuccess={handleLoginSuccess}
              onRegisterSuccess={handleRegisterSuccess}
            />
          </div>
        </div>
      )}
      
      {/* Save play modal */}
      <SavePlayModal
        isOpen={saveModalOpen}
        onClose={() => setSaveModalOpen(false)}
        playName={playName}
        canvasData={{ players, arrows, balls }}
        onSaveToLocalStorage={savePlayToLocalStorage}
        onSaveToDatabase={savePlayToDatabase}
        currentUser={currentUser}
      />
      
      <div className="flex-1 flex flex-row">
        {/* Tools panel */}
        <div className="w-64 bg-gray-100 p-4 flex flex-col">
          <h2 className="text-lg font-bold mb-4">Lacrosse Play Designer</h2>
          
          {/* Play name input */}
          <div className="mb-4">
            <label htmlFor="playName" className="block text-sm font-medium mb-1">Play Name</label>
            <input
              type="text"
              id="playName"
              value={playName}
              onChange={(e) => setPlayName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          
          {/* Save button */}
          <button
            onClick={() => setSaveModalOpen(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-md mb-3 hover:bg-green-700"
          >
            Save Play
          </button>
          
          {/* Export/Import buttons */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={exportPlay}
              className="bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700 flex-1"
            >
              Download
            </button>
            <label className="bg-purple-600 text-white px-3 py-2 rounded-md hover:bg-purple-700 flex-1 text-center cursor-pointer">
              Import
              <input
                type="file"
                accept=".json"
                onChange={importPlay}
                className="hidden"
              />
            </label>
          </div>
          
          {/* Login status */}
          <div className="bg-gray-200 p-3 rounded-md mb-6">
            {currentUser ? (
              <div>
                <p className="text-sm mb-2">
                  Logged in as <span className="font-bold">{currentUser.username}</span>
                </p>
                <button
                  onClick={handleLogout}
                  className="bg-red-500 text-white px-2 py-1 text-xs rounded-md w-full"
                >
                  Log Out
                </button>
              </div>
            ) : (
              <div>
                <p className="text-sm mb-2">Not logged in</p>
                <button
                  onClick={() => setShowLogin(true)}
                  className="bg-blue-500 text-white px-2 py-1 text-xs rounded-md w-full"
                >
                  Log In / Register
                </button>
              </div>
            )}
          </div>
          
          {/* Team toggle */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Show Team</label>
            <select
              value={activeTeam}
              onChange={(e) => setActiveTeam(e.target.value as 'blue' | 'red' | 'both')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="both">Both Teams</option>
              <option value="blue">Blue Team</option>
              <option value="red">Red Team</option>
            </select>
          </div>
          
          {/* Custom position */}
          <div className="mb-6">
            <label htmlFor="customPosition" className="block text-sm font-medium mb-1">Player Position Label</label>
            <input
              type="text"
              id="customPosition"
              value={customPosition}
              onChange={(e) => setCustomPosition(e.target.value)}
              maxLength={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          
          {/* Tools selection */}
          <h3 className="font-semibold mb-2">Tools</h3>
          <div className="grid grid-cols-2 gap-2 mb-6">
            <button
              className={`p-2 rounded-md ${selectedTool === 'select' ? 'bg-green-600 text-white' : 'bg-gray-200'}`}
              onClick={() => setSelectedTool('select')}
            >
              Select
            </button>
            <button
              className={`p-2 rounded-md ${selectedTool === 'player' ? 'bg-green-600 text-white' : 'bg-gray-200'}`}
              onClick={() => setSelectedTool('player')}
            >
              Player
            </button>
            <button
              className={`p-2 rounded-md ${selectedTool === 'ball' ? 'bg-green-600 text-white' : 'bg-gray-200'}`}
              onClick={() => setSelectedTool('ball')}
            >
              Ball
            </button>
            <button
              className={`p-2 rounded-md ${selectedTool === 'move' ? 'bg-green-600 text-white' : 'bg-gray-200'}`}
              onClick={() => setSelectedTool('move')}
            >
              Move Arrow
            </button>
            <button
              className={`p-2 rounded-md ${selectedTool === 'pass' ? 'bg-green-600 text-white' : 'bg-gray-200'}`}
              onClick={() => setSelectedTool('pass')}
            >
              Pass Arrow
            </button>
            <button
              className={`p-2 rounded-md ${selectedTool === 'shoot' ? 'bg-green-600 text-white' : 'bg-gray-200'}`}
              onClick={() => setSelectedTool('shoot')}
            >
              Shoot Arrow
            </button>
            <button
              className={`p-2 rounded-md ${selectedTool === 'erase' ? 'bg-green-600 text-white' : 'bg-gray-200'}`}
              onClick={() => setSelectedTool('erase')}
            >
              Eraser
            </button>
          </div>
          
          {/* History controls */}
          <div className="flex space-x-2 mb-4">
            <button
              onClick={handleUndo}
              disabled={history.past.length === 0}
              className={`px-4 py-2 rounded-md ${history.past.length === 0 ? 'bg-gray-300' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
            >
              Undo
            </button>
            <button
              onClick={handleRedo}
              disabled={history.future.length === 0}
              className={`px-4 py-2 rounded-md ${history.future.length === 0 ? 'bg-gray-300' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
            >
              Redo
            </button>
          </div>
          
          {/* Animation controls */}
          <div className="mt-auto">
            <button
              onClick={toggleAnimation}
              className={`w-full px-4 py-2 rounded-md ${isAnimating ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-amber-500 text-white hover:bg-amber-600'}`}
            >
              {isAnimating ? 'Stop Animation' : 'Play Animation'}
            </button>
            
            {isAnimating && (
              <div className="mt-2">
                <label className="block text-sm font-medium mb-1">Animation Progress</label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={animationProgress}
                  onChange={(e) => setAnimationProgress(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>
            )}
          </div>
        </div>
        
        {/* Field display */}
        <div className="flex-1 bg-gray-200 p-4 flex items-center justify-center overflow-auto">
          {renderField()}
        </div>
      </div>
    </div>
  );
};

export default LacrossePage;