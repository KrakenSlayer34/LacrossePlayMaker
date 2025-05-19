import { CanvasElement } from '@shared/schema';
import { nanoid } from 'nanoid';

// Generate a unique ID for canvas elements
export const generateElementId = (): string => {
  return nanoid();
};

// Clone a canvas element
export const cloneElement = (element: CanvasElement): CanvasElement => {
  return {
    ...element,
    id: generateElementId()
  };
};

// Calculate the distance between two points
export const distance = (x1: number, y1: number, x2: number, y2: number): number => {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
};

// Determine if a point is near a line segment
export const isPointNearLine = (
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  threshold = 5
): boolean => {
  // Line length
  const lineLength = distance(x1, y1, x2, y2);
  if (lineLength === 0) return distance(px, py, x1, y1) <= threshold;

  // Calculate the projection
  const t =
    ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / (lineLength * lineLength);

  // If projection falls outside the line segment
  if (t < 0) return distance(px, py, x1, y1) <= threshold;
  if (t > 1) return distance(px, py, x2, y2) <= threshold;

  // Find the projection point
  const projX = x1 + t * (x2 - x1);
  const projY = y1 + t * (y2 - y1);

  // Distance from point to projection
  return distance(px, py, projX, projY) <= threshold;
};

// Determine if a point is inside a player circle
export const isPointInCircle = (
  px: number,
  py: number,
  cx: number,
  cy: number,
  radius: number
): boolean => {
  return distance(px, py, cx, cy) <= radius;
};

// Get default icon for player position
export const getPlayerPositionIcon = (position: string): string => {
  switch (position) {
    case 'G':
      return 'G';
    case 'D':
      return 'D';
    case 'M':
      return 'M';
    case 'A':
      return 'A';
    default:
      return 'X';
  }
};

// Get color for a team
export const getTeamColor = (team: 'blue' | 'red'): string => {
  return team === 'blue' ? '#3498DB' : '#E74C3C';
};

// Arrow drawing helpers
export const getArrowPoints = (
  startX: number,
  startY: number,
  endX: number,
  endY: number
): number[] => {
  return [startX, startY, endX, endY];
};

// Get specific style for arrow type
export const getArrowStyle = (type: string): Record<string, any> => {
  switch (type) {
    case 'moveArrow':
      return {
        stroke: '#3498DB',
        fill: '#3498DB',
        strokeWidth: 3,
        dash: [5, 5],
      };
    case 'passArrow':
      return {
        stroke: '#27AE60',
        fill: '#27AE60',
        strokeWidth: 2,
        dash: [],
      };
    case 'shootArrow':
      return {
        stroke: '#E74C3C',
        fill: '#E74C3C',
        strokeWidth: 3,
        dash: [],
      };
    default:
      return {
        stroke: 'black',
        fill: 'black',
        strokeWidth: 2,
        dash: [],
      };
  }
};
