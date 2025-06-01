// components/contextual-help.tsx
'use client';

import { useState, useEffect } from 'react';
import { 
  HelpCircle, 
  Info, 
  AlertTriangle, 
  CheckCircle, 
  X,
  ChevronRight,
  BookOpen,
  Video,
  ExternalLink,
  Lightbulb
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Help content types
interface HelpContent {
  title: string;
  description: string;
  type: 'info' | 'warning' | 'success' | 'tip';
  details?: string;
  links?: Array<{
    title: string;
    url: string;
    type: 'documentation' | 'video' | 'external';
  }>;
  examples?: Array<{
    title: string;
    content: string;
  }>;
  relatedTopics?: string[];
}

interface ContextualHelpProps {
  topic: string;
  content?: HelpContent;
  trigger?: 'icon' | 'text' | 'custom';
  placement?: 'top' | 'bottom' | 'left' | 'right';
  size?: 'sm' | 'md' | 'lg';
  children?: React.ReactNode;
  className?: string;
}

// Help content database
const HELP_CONTENT: Record<string, HelpContent> = {
  'clinical-significance': {
    title: 'Clinical Significance',
    description: 'Classification of variants based on their clinical impact and pathogenicity.',
    type: 'info',
    details: 'Clinical significance is determined by evidence from literature, functional studies, and population data. Classifications follow ACMG guidelines.',
    links: [
      {
        title: 'ACMG Guidelines',
        url: 'https://www.acmg.net/docs/Standards_Guidelines_for_the_Interpretation_of_Sequence_Variants.pdf',
        type: 'documentation'
      },
      {
        title: 'ClinVar Documentation',
        url: 'https://www.ncbi.nlm.nih.gov/clinvar/docs/clinsig/',
        type: 'external'
      }
    ],
    examples: [
      {
        title: 'Pathogenic',
        content: 'Variants with sufficient evidence of pathogenicity. Associated with disease.'
      },
      {
        title: 'Likely Pathogenic',
        content: 'Variants with strong evidence supporting pathogenicity but not definitive.'
      },
      {
        title: 'Uncertain Significance',
        content: 'Variants with conflicting or insufficient evidence for classification.'
      }
    ],
    relatedTopics: ['variant-impact', 'gene-expression', 'population-frequency']
  },
  'variant-impact': {
    title: 'Variant Impact',
    description: 'Predicted functional consequence of genetic variants on protein function.',
    type: 'info',
    details: 'Impact levels are predicted based on the type of change and its location within the gene structure.',
    examples: [
      {
        title: 'HIGH Impact',
        content: 'Variants likely to disrupt protein function (stop-gain, frameshift, splice variants)'
      },
      {
        title: 'MODERATE Impact',
        content: 'Non-synonymous variants that may affect protein function'
      },
      {
        title: 'LOW Impact',
        content: 'Synonymous variants with minimal predicted impact'
      },
      {
        title: 'MODIFIER Impact',
        content: 'Variants in non-coding regions with uncertain impact'
      }
    ],
    relatedTopics: ['clinical-significance', 'protein-structure', 'functional-annotation']
  },
  'allele-frequency': {
    title: 'Allele Frequency',
    description: 'The proportion of individuals in a population that carry a specific variant.',
    type: 'info',
    details: 'Frequency data helps distinguish between common polymorphisms and rare disease-causing variants.',
    examples: [
      {
        title: 'Common Variants',
        content: 'Frequency > 1% in population. Usually benign polymorphisms.'
      },
      {
        title: 'Rare Variants',
        content: 'Frequency < 1%. More likely to be pathogenic if affecting function.'
      },
      {
        title: 'Ultra-rare Variants',
        content: 'Frequency < 0.01%. Often private mutations or recent mutations.'
      }
    ],
    relatedTopics: ['population-genetics', 'variant-filtering', 'clinical-significance']
  },
  'gene-expression': {
    title: 'Gene Expression',
    description: 'The process by which genetic information is converted into functional products.',
    type: 'info',
    details: 'Gene expression patterns help understand tissue-specific functions and disease mechanisms.',
    relatedTopics: ['transcriptomics', 'functional-annotation', 'pathway-analysis']
  },
  'vcf-format': {
    title: 'VCF Format',
    description: 'Variant Call Format - standard format for storing genetic variant data.',
    type: 'tip',
    details: 'VCF files contain variant positions, alleles, quality scores, and annotations.',
    links: [
      {
        title: 'VCF Specification',
        url: 'https://samtools.github.io/hts-specs/VCFv4.3.pdf',
        type: 'documentation'
      }
    ],
    examples: [
      {
        title: 'Required Fields',
        content: 'CHROM, POS, ID, REF, ALT, QUAL, FILTER, INFO'
      },
      {
        title: 'Optional Fields',
        content: 'FORMAT and sample-specific genotype data'
      }
    ],
    relatedTopics: ['file-formats', 'data-import', 'variant-annotation']
  },
  'keyboard-shortcuts': {
    title: 'Keyboard Shortcuts',
    description: 'Navigate the platform efficiently using keyboard shortcuts.',
    type: 'tip',
    details: 'Use keyboard shortcuts to speed up common tasks and navigation.',
    examples: [
      {
        title: 'Search',
        content: 'Press "/" to focus the search bar'
      },
      {
        title: 'Navigation',
        content: 'Press "g" for genes, "v" for variants, "h" for home'
      },
      {
        title: 'Actions',
        content: 'Ctrl+E for export, Ctrl+A for select all'
      }
    ],
    relatedTopics: ['navigation', 'productivity', 'user-interface']
  }
};

// Smart help that shows contextual tips
export function SmartHelp({ className = '' }: { className?: string }) {
  const [currentTip, setCurrentTip] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<string[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem('genomics-dismissed-tips');
    if (stored) {
      setDismissed(JSON.parse(stored));
    }
  }, []);

  const dismissTip = (tip: string) => {
    const newDismissed = [...dismissed, tip];
    setDismissed(newDismissed);
    localStorage.setItem('genomics-dismissed-tips', JSON.stringify(newDismissed));
    setCurrentTip(null);
  };

  const showRandomTip = () => {
    const availableTips = Object.keys(HELP_CONTENT).filter(tip => !dismissed.includes(tip));
    if (availableTips.length > 0) {
      const randomTip = availableTips[Math.floor(Math.random() * availableTips.length)];
      setCurrentTip(randomTip);
    }
  };

  useEffect(() => {
    // Show tip after 5 seconds of inactivity
    const timer = setTimeout(showRandomTip, 5000);
    return () => clearTimeout(timer);
  }, [dismissed]);

  if (!currentTip || dismissed.includes(currentTip)) return null;

  const tip = HELP_CONTENT[currentTip];

  return (
    <div className={`fixed bottom-4 right-4 z-50 max-w-sm ${className}`}>
      <Card className="border-l-4 border-l-blue-500 shadow-lg">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-blue-500" />
              <span className="font-medium text-sm">Tip</span>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 w-6 p-0"
              onClick={() => dismissTip(currentTip)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm font-medium mb-1">{tip.title}</p>
          <p className="text-xs text-muted-foreground">{tip.description}</p>
        </CardContent>
      </Card>
    </div>
  );
}

// Quick help tooltip component
export function QuickHelp({ 
  topic, 
  trigger = 'icon',
  placement = 'top',
  children,
  className = ''
}: ContextualHelpProps) {
  const content = HELP_CONTENT[topic];
  
  if (!content) {
    return children || <HelpCircle className="h-4 w-4 text-muted-foreground" />;
  }

  const getIcon = () => {
    switch (content.type) {
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'tip': return <Lightbulb className="h-4 w-4 text-blue-500" />;
      default: return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const triggerElement = trigger === 'custom' ? children : (
    trigger === 'icon' ? (
      <button className={`inline-flex items-center justify-center ${className}`}>
        {getIcon()}
      </button>
    ) : (
      <button className={`text-blue-500 hover:text-blue-700 underline ${className}`}>
        {content.title}
      </button>
    )
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {triggerElement}
        </TooltipTrigger>
        <TooltipContent side={placement} className="max-w-xs">
          <div className="space-y-2">
            <p className="font-medium">{content.title}</p>
            <p className="text-sm">{content.description}</p>
            {content.examples && content.examples.length > 0 && (
              <div className="text-xs text-muted-foreground">
                <p className="font-medium">Example:</p>
                <p>{content.examples[0].content}</p>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Detailed help dialog
export function DetailedHelp({ 
  topic, 
  trigger = 'icon',
  size = 'md',
  children,
  className = ''
}: ContextualHelpProps) {
  const content = HELP_CONTENT[topic];
  
  if (!content) return children || null;

  const triggerElement = trigger === 'custom' ? children : (
    <Button variant="ghost" size="sm" className={className}>
      <HelpCircle className="h-4 w-4 mr-1" />
      Learn More
    </Button>
  );

  return (
    <Dialog>
      <DialogTrigger asChild>
        {triggerElement}
      </DialogTrigger>
      <DialogContent className={`${
        size === 'sm' ? 'max-w-md' : 
        size === 'lg' ? 'max-w-4xl' : 'max-w-2xl'
      }`}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {content.type === 'warning' && <AlertTriangle className="h-5 w-5 text-yellow-500" />}
            {content.type === 'success' && <CheckCircle className="h-5 w-5 text-green-500" />}
            {content.type === 'tip' && <Lightbulb className="h-5 w-5 text-blue-500" />}
            {content.type === 'info' && <Info className="h-5 w-5 text-blue-500" />}
            {content.title}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-muted-foreground">{content.description}</p>
          
          {content.details && (
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm">{content.details}</p>
            </div>
          )}

          <Tabs defaultValue="overview" className="w-full">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              {content.examples && <TabsTrigger value="examples">Examples</TabsTrigger>}
              {content.links && <TabsTrigger value="resources">Resources</TabsTrigger>}
              {content.relatedTopics && <TabsTrigger value="related">Related</TabsTrigger>}
            </TabsList>

            <TabsContent value="overview" className="space-y-3">
              <p>{content.details || content.description}</p>
            </TabsContent>

            {content.examples && (
              <TabsContent value="examples" className="space-y-3">
                {content.examples.map((example, index) => (
                  <div key={index} className="border rounded-lg p-3">
                    <h4 className="font-medium mb-1">{example.title}</h4>
                    <p className="text-sm text-muted-foreground">{example.content}</p>
                  </div>
                ))}
              </TabsContent>
            )}

            {content.links && (
              <TabsContent value="resources" className="space-y-3">
                {content.links.map((link, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {link.type === 'documentation' && <BookOpen className="h-4 w-4 text-blue-500" />}
                      {link.type === 'video' && <Video className="h-4 w-4 text-red-500" />}
                      {link.type === 'external' && <ExternalLink className="h-4 w-4 text-green-500" />}
                      <span className="font-medium">{link.title}</span>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <a href={link.url} target="_blank" rel="noopener noreferrer">
                        Open
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </a>
                    </Button>
                  </div>
                ))}
              </TabsContent>
            )}

            {content.relatedTopics && (
              <TabsContent value="related" className="space-y-3">
                <div className="grid gap-2 md:grid-cols-2">
                  {content.relatedTopics.map((relatedTopic, index) => {
                    const relatedContent = HELP_CONTENT[relatedTopic];
                    return relatedContent ? (
                      <DetailedHelp
                        key={index}
                        topic={relatedTopic}
                        trigger="custom"
                        className="p-3 border rounded-lg hover:bg-muted/50 transition-colors text-left"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm">{relatedContent.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {relatedContent.description.slice(0, 60)}...
                            </p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </DetailedHelp>
                    ) : null;
                  })}
                </div>
              </TabsContent>
            )}
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Context-aware help suggestions
export function HelpSuggestions({ page }: { page: string }) {
  const getPageHelp = (page: string): string[] => {
    switch (page) {
      case 'genes': return ['gene-expression', 'functional-annotation'];
      case 'variants': return ['clinical-significance', 'variant-impact', 'allele-frequency'];
      case 'import': return ['vcf-format', 'file-formats', 'data-import'];
      default: return ['keyboard-shortcuts'];
    }
  };

  const suggestions = getPageHelp(page);

  if (suggestions.length === 0) return null;

  return (
    <div className="fixed bottom-20 right-4 z-40">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="rounded-full shadow-lg">
            <HelpCircle className="h-4 w-4 mr-1" />
            Help
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="end">
          <div className="space-y-3">
            <h4 className="font-medium">Need help with this page?</h4>
            <div className="space-y-2">
              {suggestions.map((topic) => {
                const content = HELP_CONTENT[topic];
                return content ? (
                  <QuickHelp
                    key={topic}
                    topic={topic}
                    trigger="custom"
                    className="block w-full text-left p-2 rounded hover:bg-muted/50 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-sm">{content.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {content.description.slice(0, 80)}...
                      </p>
                    </div>
                  </QuickHelp>
                ) : null;
              })}
            </div>
            <div className="pt-2 border-t">
              <DetailedHelp
                topic="keyboard-shortcuts"
                trigger="custom"
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                View all keyboard shortcuts
              </DetailedHelp>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}