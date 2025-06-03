'use client';

import { useState, useEffect, useRef } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Download, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface Variant {
  id: string;
  position: number;
  ref: string;
  alt: string;
  clinicalSignificance: string;
  consequence: string;
  frequency?: number;
}

interface Gene {
  id: string;
  symbol: string;
  name: string;
  chromosome: string;
  startPosition: number;
  endPosition: number;
  strand: string;
  variants: Variant[];
}

interface GeneBrowserProps {
  gene: Gene;
  width?: number;
  height?: number;
}

export function GeneBrowser({ gene, width = 800, height = 300 }: GeneBrowserProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [viewStart, setViewStart] = useState(0);
  const [viewEnd, setViewEnd] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
  const { toast } = useToast();

  // FIX 1: Validate and set proper default values
  useEffect(() => {
    const start = gene.startPosition || 0;
    const end = gene.endPosition || start + 100000; // Default 100kb if no end position
    
    // Ensure valid range
    if (start >= end) {
      setViewStart(start);
      setViewEnd(start + 100000);
    } else {
      setViewStart(start);
      setViewEnd(end);
    }
  }, [gene]);

  const geneLength = Math.max(viewEnd - viewStart, 1); // Prevent division by zero
  const viewLength = Math.max(viewEnd - viewStart, 1);

  useEffect(() => {
    if (viewStart !== 0 || viewEnd !== 0) {
      drawGeneBrowser();
    }
  }, [gene, zoomLevel, viewStart, viewEnd]);

  const drawGeneBrowser = () => {
    const svg = svgRef.current;
    if (!svg || viewLength <= 0) return;

    // Clear previous content
    while (svg.firstChild) {
      svg.removeChild(svg.firstChild);
    }

    // Create main group
    const mainGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    svg.appendChild(mainGroup);

    // FIX 2: Safe scale function with validation
    const xScale = (position: number) => {
      const scaled = ((position - viewStart) / viewLength) * (width - 100) + 50;
      return isNaN(scaled) ? 50 : Math.max(50, Math.min(width - 50, scaled));
    };

    // Draw chromosome track
    const chromTrack = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    chromTrack.setAttribute('x', '50');
    chromTrack.setAttribute('y', String(height / 2 - 5));
    chromTrack.setAttribute('width', String(Math.max(0, width - 100)));
    chromTrack.setAttribute('height', '10');
    chromTrack.setAttribute('fill', '#e5e7eb');
    chromTrack.setAttribute('stroke', '#d1d5db');
    mainGroup.appendChild(chromTrack);

    // FIX 3: Safe gene drawing with validation
    const geneStartX = xScale(Math.max(viewStart, gene.startPosition || viewStart));
    const geneEndX = xScale(Math.min(viewEnd, gene.endPosition || viewEnd));
    const geneWidth = Math.max(1, geneEndX - geneStartX);

    // Draw gene body
    const geneRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    geneRect.setAttribute('x', String(geneStartX));
    geneRect.setAttribute('y', String(height / 2 - 15));
    geneRect.setAttribute('width', String(geneWidth));
    geneRect.setAttribute('height', '30');
    geneRect.setAttribute('fill', '#3b82f6');
    geneRect.setAttribute('stroke', '#1e40af');
    geneRect.setAttribute('rx', '5');
    mainGroup.appendChild(geneRect);

    // Add gene label
    const geneLabelX = geneStartX + geneWidth / 2;
    const geneLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    geneLabel.setAttribute('x', String(geneLabelX));
    geneLabel.setAttribute('y', String(height / 2 - 20));
    geneLabel.setAttribute('text-anchor', 'middle');
    geneLabel.setAttribute('fill', '#1f2937');
    geneLabel.setAttribute('font-family', 'system-ui');
    geneLabel.setAttribute('font-size', '14');
    geneLabel.setAttribute('font-weight', 'bold');
    geneLabel.textContent = gene.symbol;
    mainGroup.appendChild(geneLabel);

    // Draw strand indicator
    const strandIndicator = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    strandIndicator.setAttribute('x', String(Math.min(width - 30, geneEndX + 10)));
    strandIndicator.setAttribute('y', String(height / 2 + 5));
    strandIndicator.setAttribute('fill', '#6b7280');
    strandIndicator.setAttribute('font-family', 'system-ui');
    strandIndicator.setAttribute('font-size', '12');
    strandIndicator.textContent = gene.strand === '+' ? '→' : '←';
    mainGroup.appendChild(strandIndicator);

    // FIX 4: Safe variant drawing with position validation
    gene.variants.forEach((variant) => {
      if (variant.position >= viewStart && variant.position <= viewEnd) {
        const variantX = xScale(variant.position);
        
        // Skip if position is invalid
        if (isNaN(variantX) || variantX < 50 || variantX > width - 50) return;
        
        // Variant marker
        const variantMarker = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        variantMarker.setAttribute('cx', String(variantX));
        variantMarker.setAttribute('cy', String(height / 2));
        variantMarker.setAttribute('r', '4');
        variantMarker.setAttribute('fill', getVariantColor(variant.clinicalSignificance));
        variantMarker.setAttribute('stroke', '#ffffff');
        variantMarker.setAttribute('stroke-width', '2');
        variantMarker.setAttribute('cursor', 'pointer');
        
        // Add click handler
        variantMarker.addEventListener('click', () => {
          setSelectedVariant(variant);
        });
        
        // Add hover effect
        variantMarker.addEventListener('mouseenter', () => {
          variantMarker.setAttribute('r', '6');
          showVariantTooltip(variant, variantX, height / 2);
        });
        
        variantMarker.addEventListener('mouseleave', () => {
          variantMarker.setAttribute('r', '4');
          hideVariantTooltip();
        });
        
        mainGroup.appendChild(variantMarker);

        // Variant frequency bar (if available)
        if (variant.frequency && variant.frequency > 0) {
          const freqHeight = Math.min(variant.frequency * 100, 30); // Cap at 30px
          const freqBar = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          freqBar.setAttribute('x', String(variantX - 1));
          freqBar.setAttribute('y', String(height / 2 + 10));
          freqBar.setAttribute('width', '2');
          freqBar.setAttribute('height', String(freqHeight));
          freqBar.setAttribute('fill', '#10b981');
          freqBar.setAttribute('opacity', '0.7');
          mainGroup.appendChild(freqBar);
        }
      }
    });

    // Draw position scale
    drawPositionScale(mainGroup);
  };

  const drawPositionScale = (group: SVGElement) => {
    const tickCount = 5;
    const tickSpacing = (width - 100) / (tickCount - 1);

    for (let i = 0; i < tickCount; i++) {
      const x = 50 + i * tickSpacing;
      const position = Math.round(viewStart + (i / (tickCount - 1)) * viewLength);

      // Skip invalid positions
      if (isNaN(x) || isNaN(position)) continue;

      // Tick mark
      const tick = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      tick.setAttribute('x1', String(x));
      tick.setAttribute('y1', String(height - 30));
      tick.setAttribute('x2', String(x));
      tick.setAttribute('y2', String(height - 25));
      tick.setAttribute('stroke', '#6b7280');
      group.appendChild(tick);

      // Position label
      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.setAttribute('x', String(x));
      label.setAttribute('y', String(height - 10));
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('fill', '#6b7280');
      label.setAttribute('font-family', 'system-ui');
      label.setAttribute('font-size', '10');
      label.textContent = position.toLocaleString();
      group.appendChild(label);
    }
  };

  const getVariantColor = (significance: string): string => {
    switch (significance?.toLowerCase()) {
      case 'pathogenic': return '#ef4444';
      case 'likely pathogenic': return '#f97316';
      case 'uncertain significance': return '#eab308';
      case 'likely benign': return '#84cc16';
      case 'benign': return '#22c55e';
      default: return '#6b7280';
    }
  };

  const showVariantTooltip = (variant: Variant, x: number, y: number) => {
    // Create tooltip (simplified - in production use a proper tooltip library)
    const tooltip = document.getElementById('variant-tooltip');
    if (tooltip) {
      tooltip.style.display = 'block';
      tooltip.style.left = `${x}px`;
      tooltip.style.top = `${y - 40}px`;
      tooltip.innerHTML = `
        <div class="bg-black text-white p-2 rounded text-xs">
          <div>${variant.ref}>${variant.alt}</div>
          <div>Position: ${variant.position.toLocaleString()}</div>
          <div>${variant.clinicalSignificance}</div>
        </div>
      `;
    }
  };

  const hideVariantTooltip = () => {
    const tooltip = document.getElementById('variant-tooltip');
    if (tooltip) {
      tooltip.style.display = 'none';
    }
  };

  const handleZoom = (direction: 'in' | 'out') => {
    const factor = direction === 'in' ? 0.5 : 2;
    const center = (viewStart + viewEnd) / 2;
    const newLength = viewLength * factor;
    
    // FIX 5: Ensure valid zoom bounds
    const geneStart = gene.startPosition || 0;
    const geneEnd = gene.endPosition || geneStart + 100000;
    
    const newStart = Math.max(geneStart, center - newLength / 2);
    const newEnd = Math.min(geneEnd, center + newLength / 2);
    
    // Ensure valid range
    if (newStart < newEnd) {
      setViewStart(newStart);
      setViewEnd(newEnd);
      setZoomLevel(prev => direction === 'in' ? prev * 2 : prev / 2);
    }
  };

  const handleReset = () => {
    const start = gene.startPosition || 0;
    const end = gene.endPosition || start + 100000;
    
    setViewStart(start);
    setViewEnd(end);
    setZoomLevel(1);
  };

  const handleExport = () => {
    const svg = svgRef.current;
    if (!svg) return;

    try {
      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(svg);
      const blob = new Blob([svgString], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `${gene.symbol}_browser.svg`;
      link.click();
      
      URL.revokeObjectURL(url);
      
      toast({
        title: 'Export completed',
        description: 'Gene browser view has been exported as SVG',
      });
    } catch (error) {
      toast({
        title: 'Export failed',
        description: 'Failed to export gene browser view',
        variant: 'destructive',
      });
    }
  };

  // FIX 6: Don't render if invalid gene data
  if (!gene || !gene.symbol || viewStart === viewEnd) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <Info className="h-8 w-8 mx-auto mb-2" />
            <p>Invalid gene data for browser visualization</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Gene Browser: {gene.symbol}</CardTitle>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={() => handleZoom('in')}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleZoom('out')}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Browser Controls */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">Zoom:</span>
            <span className="text-sm">{zoomLevel.toFixed(1)}x</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">Region:</span>
            <span className="text-sm font-mono">
              {viewStart.toLocaleString()} - {viewEnd.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">Length:</span>
            <span className="text-sm">
              {(viewEnd - viewStart).toLocaleString()} bp
            </span>
          </div>
        </div>

        {/* Gene Browser SVG */}
        <div className="relative border rounded-lg bg-white">
          <svg
            ref={svgRef}
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-auto"
          />
          <div
            id="variant-tooltip"
            className="absolute pointer-events-none z-10"
            style={{ display: 'none' }}
          />
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-blue-500 rounded"></div>
            <span className="text-sm">Gene Body</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span className="text-sm">Pathogenic</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
            <span className="text-sm">Likely Pathogenic</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <span className="text-sm">Uncertain</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm">Benign</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-4 bg-green-500 opacity-70"></div>
            <span className="text-sm">Frequency</span>
          </div>
        </div>

        {/* Selected Variant Info */}
        {selectedVariant && (
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Info className="h-5 w-5 text-blue-600" />
                Selected Variant Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Position</p>
                  <p className="font-mono text-sm">{selectedVariant.position.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Change</p>
                  <p className="font-mono text-sm">{selectedVariant.ref}→{selectedVariant.alt}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Consequence</p>
                  <p className="text-sm">{selectedVariant.consequence || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Frequency</p>
                  <p className="text-sm">
                    {selectedVariant.frequency ? (selectedVariant.frequency * 100).toFixed(4) + '%' : 'N/A'}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Badge 
                  variant={selectedVariant.clinicalSignificance?.toLowerCase().includes('pathogenic') ? 'destructive' : 'secondary'}
                  className="text-sm"
                >
                  {selectedVariant.clinicalSignificance || 'Unknown'}
                </Badge>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setSelectedVariant(null)}
                >
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">{gene.variants.length}</p>
            <p className="text-sm text-gray-600">Total Variants</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-red-600">
              {gene.variants.filter(v => v.clinicalSignificance?.toLowerCase().includes('pathogenic')).length}
            </p>
            <p className="text-sm text-gray-600">Pathogenic</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-yellow-600">
              {gene.variants.filter(v => v.clinicalSignificance?.toLowerCase().includes('uncertain')).length}
            </p>
            <p className="text-sm text-gray-600">Uncertain</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">
              {gene.variants.filter(v => v.clinicalSignificance?.toLowerCase().includes('benign')).length}
            </p>
            <p className="text-sm text-gray-600">Benign</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}