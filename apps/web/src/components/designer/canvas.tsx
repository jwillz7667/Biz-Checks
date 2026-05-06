'use client';

import { type KonvaEventObject } from 'konva/lib/Node';
import { useCallback, useMemo, useRef } from 'react';
import { Group, Image as KonvaImage, Layer, Line, Rect, Stage, Text } from 'react-konva';
import useImage from 'use-image';


import type {
  CanvasObject,
  Position,
  ShapeObject,
  ImageObject,
  TemplateDocument,
} from '@/lib/api/types';
import type Konva from 'konva';

import { useDesignerStore, describeValue } from '@/lib/designer/store';

const POINTS_PER_INCH = 72;

interface DesignerCanvasProps {
  width: number;
  height: number;
}

/**
 * The drawing surface. Coordinates inside the document are in PostScript
 * points; the Stage is scaled by `zoom` so that 1 pt = 1 px at zoom=1.
 *
 * Selection, drag, and resize all flow back through the zustand store via
 * `updateObject` so undo/dirty tracking stays consistent.
 */
export function DesignerCanvas({ width, height }: DesignerCanvasProps): React.JSX.Element {
  const document = useDesignerStore((s) => s.document);
  const zoom = useDesignerStore((s) => s.zoom);
  const showGuides = useDesignerStore((s) => s.showGuides);
  const snapToGrid = useDesignerStore((s) => s.snapToGrid);
  const gridSizePt = useDesignerStore((s) => s.gridSizePt);
  const selectedId = useDesignerStore((s) => s.selectedId);
  const selectObject = useDesignerStore((s) => s.selectObject);
  const updateObject = useDesignerStore((s) => s.updateObject);

  if (!document) return <div className="text-sm text-gray-500">Loading…</div>;

  const stockSize = document.stock.checkSize;
  const padPt = POINTS_PER_INCH * 0.5;
  const stageW = Math.max(width, 200);
  const stageH = Math.max(height, 200);

  const fitScale = useMemo(() => {
    const scaleX = (stageW - padPt * 2) / stockSize.width;
    const scaleY = (stageH - padPt * 2) / stockSize.height;
    return Math.max(0.05, Math.min(scaleX, scaleY));
  }, [stageW, stageH, stockSize.width, stockSize.height]);

  const scale = fitScale * zoom;
  const offsetX = Math.max(padPt, (stageW - stockSize.width * scale) / 2);
  const offsetY = Math.max(padPt, (stageH - stockSize.height * scale) / 2);

  const handleStageClick = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      if (e.target === e.target.getStage()) selectObject(null);
    },
    [selectObject],
  );

  const snap = useCallback(
    (v: number): number => {
      if (!snapToGrid) return v;
      return Math.round(v / gridSizePt) * gridSizePt;
    },
    [snapToGrid, gridSizePt],
  );

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#f3f4f6]">
      <Stage width={stageW} height={stageH} onMouseDown={handleStageClick} className="block">
        <Layer listening={false}>
          {/* Paper drop shadow */}
          <Rect
            x={offsetX + 2}
            y={offsetY + 4}
            width={stockSize.width * scale}
            height={stockSize.height * scale}
            fill="rgba(0,0,0,0.1)"
            cornerRadius={2}
          />
          {/* Paper */}
          <Rect
            x={offsetX}
            y={offsetY}
            width={stockSize.width * scale}
            height={stockSize.height * scale}
            fill={document.background}
            cornerRadius={2}
            stroke="#d1d5db"
            strokeWidth={1}
          />

          {showGuides ? (
            <GuideGrid
              offsetX={offsetX}
              offsetY={offsetY}
              widthPt={stockSize.width}
              heightPt={stockSize.height}
              scale={scale}
              gridSizePt={gridSizePt}
            />
          ) : null}

          {/* MICR clear-band guide (5/8" from bottom) */}
          {showGuides ? (
            <Line
              points={[
                offsetX,
                offsetY + (stockSize.height - POINTS_PER_INCH * 0.625) * scale,
                offsetX + stockSize.width * scale,
                offsetY + (stockSize.height - POINTS_PER_INCH * 0.625) * scale,
              ]}
              stroke="#3b82f6"
              strokeWidth={1}
              dash={[4, 4]}
              opacity={0.4}
            />
          ) : null}
        </Layer>

        <Layer>
          <Group x={offsetX} y={offsetY} scaleX={scale} scaleY={scale}>
            {sortedObjects(document).map((obj) => (
              <ObjectNode
                key={obj.id}
                object={obj}
                selected={obj.id === selectedId}
                onSelect={() => selectObject(obj.id)}
                onChange={(patch) =>
                  updateObject(obj.id, (prev) => mergeObject(prev, patch, snap))
                }
              />
            ))}
          </Group>
        </Layer>
      </Stage>
    </div>
  );
}

function sortedObjects(doc: TemplateDocument): CanvasObject[] {
  return [...doc.objects].sort((a, b) => a.zIndex - b.zIndex);
}

interface ObjectNodeProps {
  object: CanvasObject;
  selected: boolean;
  onSelect: () => void;
  onChange: (patch: Partial<CanvasObject>) => void;
}

function ObjectNode({ object, selected, onSelect, onChange }: ObjectNodeProps): React.JSX.Element {
  const ref = useRef<Konva.Group>(null);

  const handleDragEnd = (e: KonvaEventObject<DragEvent>): void => {
    onChange({ position: { x: e.target.x(), y: e.target.y() } });
  };

  const commonGroup = {
    x: object.position.x,
    y: object.position.y,
    rotation: object.rotation,
    draggable: !object.locked && object.visible,
    visible: object.visible,
    onMouseDown: (e: KonvaEventObject<MouseEvent>) => {
      e.cancelBubble = true;
      onSelect();
    },
    onDragEnd: handleDragEnd,
    opacity: object.visible ? 1 : 0.3,
  };

  return (
    <Group ref={ref} {...commonGroup}>
      <ObjectBody object={object} />
      {selected ? (
        <SelectionFrame width={object.size.width} height={object.size.height} />
      ) : null}
    </Group>
  );
}

function ObjectBody({ object }: { object: CanvasObject }): React.JSX.Element {
  const { width, height } = object.size;
  switch (object.kind) {
    case 'text': {
      return (
        <Text
          width={width}
          height={height}
          text={describeValue(object.value)}
          fontFamily={object.fontFamily}
          fontSize={object.fontSize}
          fontStyle={[
            object.fontWeight === 'bold' || object.fontWeight === 'semibold' ? 'bold' : 'normal',
            object.italic ? 'italic' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          fill={object.color}
          align={object.justification}
          lineHeight={object.lineHeight}
          letterSpacing={object.letterSpacing}
          listening
        />
      );
    }
    case 'micr': {
      return (
        <>
          <Rect width={width} height={height} fill="#fff" stroke="#cbd5e1" dash={[2, 2]} />
          <Text
            width={width}
            height={height}
            padding={4}
            text={describeValue(object.value)}
            fontFamily="MICR-E13B-Web, Courier New"
            fontSize={object.fontSize}
            fill={object.color}
            align={object.justification}
            verticalAlign="middle"
          />
        </>
      );
    }
    case 'amount-box': {
      return (
        <>
          <Rect width={width} height={height} fill="#fff" stroke="#9ca3af" cornerRadius={2} />
          <Text
            width={width}
            height={height}
            padding={4}
            text={`${object.showCurrencySymbol ? '$ ' : ''}${describeValue(object.value)}`}
            fontFamily={object.fontFamily}
            fontSize={object.fontSize}
            fontStyle="bold"
            fill={object.color}
            align={object.justification}
            verticalAlign="middle"
          />
        </>
      );
    }
    case 'shape':
      return <ShapeBody shape={object} />;
    case 'image':
      return <RemoteImage object={object} />;
    case 'signature':
      return (
        <>
          <Rect width={width} height={height} fill="#f9fafb" stroke="#d1d5db" dash={[3, 3]} />
          <Text
            width={width}
            height={height}
            text="Signature"
            fontFamily="Inter"
            fontSize={11}
            fill="#9ca3af"
            align="center"
            verticalAlign="middle"
          />
        </>
      );
  }
}

function ShapeBody({ shape }: { shape: ShapeObject }): React.JSX.Element {
  const { width, height } = shape.size;
  if (shape.shape === 'line') {
    return (
      <Line
        points={[0, height / 2, width, height / 2]}
        stroke={shape.strokeColor}
        strokeWidth={shape.strokeWidth}
        listening
      />
    );
  }
  return (
    <Rect
      width={width}
      height={height}
      stroke={shape.strokeColor}
      strokeWidth={shape.strokeWidth}
      fill={shape.fillColor ?? 'transparent'}
      cornerRadius={shape.shape === 'ellipse' ? Math.min(width, height) / 2 : shape.cornerRadius}
    />
  );
}

function RemoteImage({ object }: { object: ImageObject }): React.JSX.Element {
  const [img] = useImage(object.url, 'anonymous');
  if (!img) {
    return (
      <Rect
        width={object.size.width}
        height={object.size.height}
        fill="#f3f4f6"
        stroke="#d1d5db"
        dash={[3, 3]}
      />
    );
  }
  return (
    <KonvaImage
      image={img}
      width={object.size.width}
      height={object.size.height}
      listening
    />
  );
}

function SelectionFrame({ width, height }: { width: number; height: number }): React.JSX.Element {
  return (
    <Rect
      x={-2}
      y={-2}
      width={width + 4}
      height={height + 4}
      stroke="#2563eb"
      strokeWidth={1.5}
      dash={[4, 3]}
      listening={false}
    />
  );
}

function GuideGrid({
  offsetX,
  offsetY,
  widthPt,
  heightPt,
  scale,
  gridSizePt,
}: {
  offsetX: number;
  offsetY: number;
  widthPt: number;
  heightPt: number;
  scale: number;
  gridSizePt: number;
}): React.JSX.Element {
  const lines: React.ReactNode[] = [];
  for (let x = 0; x <= widthPt; x += gridSizePt) {
    lines.push(
      <Line
        key={`gx-${x}`}
        points={[offsetX + x * scale, offsetY, offsetX + x * scale, offsetY + heightPt * scale]}
        stroke={x % POINTS_PER_INCH === 0 ? '#cbd5e1' : '#e5e7eb'}
        strokeWidth={x % POINTS_PER_INCH === 0 ? 0.6 : 0.4}
        listening={false}
      />,
    );
  }
  for (let y = 0; y <= heightPt; y += gridSizePt) {
    lines.push(
      <Line
        key={`gy-${y}`}
        points={[offsetX, offsetY + y * scale, offsetX + widthPt * scale, offsetY + y * scale]}
        stroke={y % POINTS_PER_INCH === 0 ? '#cbd5e1' : '#e5e7eb'}
        strokeWidth={y % POINTS_PER_INCH === 0 ? 0.6 : 0.4}
        listening={false}
      />,
    );
  }
  return <>{lines}</>;
}

function mergeObject(
  prev: CanvasObject,
  patch: Partial<CanvasObject>,
  snap: (v: number) => number,
): CanvasObject {
  let next = { ...prev };
  if (patch.position) {
    next = {
      ...next,
      position: { x: snap(patch.position.x), y: snap(patch.position.y) },
    };
  }
  if (patch.size) {
    next = { ...next, size: patch.size };
  }
  return next;
}

/** Re-export so consumers can import a single named symbol. */
export type { Position };
