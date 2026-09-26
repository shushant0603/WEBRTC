import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

export type DrawingStroke = {
  type: 'draw';
  phase: 'start' | 'move' | 'end';
  x: number;
  y: number;
  color: string;
  width: number;
};

export type DrawingCanvasHandle = {
  clear: () => void;
  drawRemoteStroke: (stroke: DrawingStroke) => void;
};

type DrawingCanvasProps = {
  onStroke: (stroke: DrawingStroke) => void;
};

export const DrawingCanvas = forwardRef<DrawingCanvasHandle, DrawingCanvasProps>(
  function DrawingCanvas({ onStroke }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const drawingRef = useRef(false);
    const lastPointRef = useRef<{ x: number; y: number } | null>(null);

    const resizeCanvas = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const bounds = canvas.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      const image = canvas.toDataURL();
      canvas.width = Math.round(bounds.width * ratio);
      canvas.height = Math.round(bounds.height * ratio);
      const context = canvas.getContext('2d');
      if (!context) return;
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.scale(ratio, ratio);

      if (image !== 'data:,') {
        const restoredImage = new Image();
        restoredImage.onload = () => context.drawImage(restoredImage, 0, 0, bounds.width, bounds.height);
        restoredImage.src = image;
      }
    };

    useEffect(() => {
      resizeCanvas();
      window.addEventListener('resize', resizeCanvas);
      return () => window.removeEventListener('resize', resizeCanvas);
    }, []);

    const drawStroke = (stroke: DrawingStroke) => {
      const canvas = canvasRef.current;
      const context = canvas?.getContext('2d');
      if (!canvas || !context) return;

      const bounds = canvas.getBoundingClientRect();
      const x = stroke.x * bounds.width;
      const y = stroke.y * bounds.height;
      context.strokeStyle = stroke.color;
      context.lineWidth = stroke.width;
      context.lineCap = 'round';
      context.lineJoin = 'round';

      if (stroke.phase === 'start' || !lastPointRef.current) {
        context.beginPath();
        context.moveTo(x, y);
      } else {
        context.lineTo(x, y);
        context.stroke();
      }

      lastPointRef.current = { x, y };
      if (stroke.phase === 'end') lastPointRef.current = null;
    };

    useImperativeHandle(ref, () => ({
      clear() {
        const canvas = canvasRef.current;
        const context = canvas?.getContext('2d');
        if (canvas && context) {
          context.setTransform(1, 0, 0, 1, 0, 0);
          context.clearRect(0, 0, canvas.width, canvas.height);
          context.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
        }
      },
      drawRemoteStroke: drawStroke,
    }));

    const getPoint = (event: React.PointerEvent<HTMLCanvasElement>) => {
      const bounds = event.currentTarget.getBoundingClientRect();
      return {
        x: Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width)),
        y: Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height)),
      };
    };

    const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
      event.currentTarget.setPointerCapture(event.pointerId);
      drawingRef.current = true;
      const point = getPoint(event);
      const stroke: DrawingStroke = { type: 'draw', phase: 'start', ...point, color: '#173b43', width: 3 };
      drawStroke(stroke);
      onStroke(stroke);
    };

    const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (!drawingRef.current) return;
      const point = getPoint(event);
      const stroke: DrawingStroke = { type: 'draw', phase: 'move', ...point, color: '#173b43', width: 3 };
      drawStroke(stroke);
      onStroke(stroke);
    };

    const endStroke = (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (!drawingRef.current) return;
      drawingRef.current = false;
      const point = getPoint(event);
      const stroke: DrawingStroke = { type: 'draw', phase: 'end', ...point, color: '#173b43', width: 3 };
      drawStroke(stroke);
      onStroke(stroke);
    };

    return (
      <canvas
        ref={canvasRef}
        className="drawing-canvas"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endStroke}
        onPointerCancel={endStroke}
      />
    );
  },
);
