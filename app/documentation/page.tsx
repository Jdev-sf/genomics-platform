'use client';

import { useState } from 'react';
import { 
  FileText, 
  Search, 
  BookOpen, 
  Code, 
  Database, 
  Activity,
  Upload,
  Brain,
  Shield,
  Settings,
  ExternalLink,
  ChevronRight,
  Home
} from 'lucide-react';
import { ModernHeader } from '@/components/layout/modern-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface DocSection {
  id: string;
  title: string;
  icon: React.ElementType;
  description: string;
  items: {
    id: string;
    title: string;
    description: string;
    url?: string;
    badge?: string;
  }[];
}

export default function DocumentationPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSection, setSelectedSection] = useState<string | null>(null);

  const sections: DocSection[] = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      icon: Home,
      description: 'Learn the basics of using the Genomics Platform',
      items: [
        {
          id: 'quick-start',
          title: 'Quick Start Guide',
          description: 'Get up and running in 5 minutes',
          badge: 'Popular'
        },
        {
          id: 'platform-overview',
          title: 'Platform Overview',
          description: 'Understanding the core features and capabilities'
        },
        {
          id: 'user-roles',
          title: 'User Roles & Permissions',
          description: 'Different access levels and what they can do'
        },
        {
          id: 'first-search',
          title: 'Your First Search',
          description: 'Step-by-step guide to searching genes and variants'
        }
      ]
    },
    {
      id: 'genes-variants',
      title: 'Genes & Variants',
      icon: Database,
      description: 'Working with genomic data',
      items: [
        {
          id: 'gene-search',
          title: 'Gene Search & Filtering',
          description: 'Advanced search techniques and filtering options'
        },
        {
          id: 'variant-analysis',
          title: 'Variant Analysis',
          description: 'Understanding variant types and clinical significance'
        },
        {
          id: 'gene-browser',
          title: 'Interactive Gene Browser',
          description: 'Navigate genomic regions visually',
          badge: 'New'
        },
        {
          id: 'clinical-interpretation',
          title: 'Clinical Interpretation',
          description: 'Guidelines for interpreting variant pathogenicity'
        }
      ]
    },
    {
      id: 'ai-features',
      title: 'AI Features',
      icon: Brain,
      description: 'AI-powered analysis and insights',
      items: [
        {
          id: 'variant-prediction',
          title: 'Variant Pathogenicity Prediction',
          description: 'AI-powered variant classification',
          badge: 'AI'
        },
        {
          id: 'literature-suggestions',
          title: 'Literature Suggestions',
          description: 'Relevant publications and research'
        },
        {
          id: 'ai-insights',
          title: 'AI Insights & Recommendations',
          description: 'Automated analysis and suggestions'
        },
        {
          id: 'similar-variants',
          title: 'Similar Variant Detection',
          description: 'Find related variants and patterns'
        }
      ]
    },
    {
      id: 'data-import',
      title: 'Data Import & Export',
      icon: Upload,
      description: 'Managing your genomic datasets',
      items: [
        {
          id: 'import-formats',
          title: 'Supported File Formats',
          description: 'CSV, JSON, and other supported formats'
        },
        {
          id: 'import-guidelines',
          title: 'Import Guidelines',
          description: 'Best practices for data preparation'
        },
        {
          id: 'batch-operations',
          title: 'Batch Operations',
          description: 'Processing multiple files efficiently'
        },
        {
          id: 'export-options',
          title: 'Export Options',
          description: 'Download data in various formats'
        }
      ]
    },
    {
      id: 'api',
      title: 'API Reference',
      icon: Code,
      description: 'Programmatic access to the platform',
      items: [
        {
          id: 'api-overview',
          title: 'API Overview',
          description: 'Introduction to the REST API'
        },
        {
          id: 'authentication',
          title: 'Authentication',
          description: 'API keys and authentication methods'
        },
        {
          id: 'endpoints',
          title: 'Endpoints Reference',
          description: 'Complete API endpoint documentation'
        },
        {
          id: 'examples',
          title: 'Code Examples',
          description: 'Sample code in various languages'
        }
      ]
    },
    {
      id: 'security',
      title: 'Security & Privacy',
      icon: Shield,
      description: 'Keeping your data safe and secure',
      items: [
        {
          id: 'data-protection',
          title: 'Data Protection',
          description: 'How we protect your genomic data'
        },
        {
          id: 'access-controls',
          title: 'Access Controls',
          description: 'Managing user permissions and roles'
        },
        {
          id: 'compliance',
          title: 'Compliance',
          description: 'GDPR, HIPAA, and other regulations'
        },
        {
          id: 'best-practices',
          title: 'Security Best Practices',
          description: 'Recommendations for secure usage'
        }
      ]
    }
  ];

  const filteredSections = sections.map(section => ({
    ...section,
    items: section.items.filter(item =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(section => section.items.length > 0 || !searchQuery);

  const handleItemClick = (sectionId: string, itemId: string) => {
    // In a real app, this would navigate to the specific documentation page
    console.log(`Navigate to: ${sectionId}/${itemId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <ModernHeader />
      <div className="container mx-auto py-6 space-y-6 px-4">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-600 dark:from-white dark:via-gray-200 dark:to-gray-400 bg-clip-text text-transparent">
            Documentation
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Everything you need to know about using the Genomics Platform
          </p>
        </div>

        {/* Search */}
        <Card className="max-w-2xl mx-auto">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search documentation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 text-lg h-12"
              />
            </div>
          </CardContent>
        </Card>

        {searchQuery ? (
          /* Search Results */
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold">Search Results</h2>
            {filteredSections.map((section) => (
              <Card key={section.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <section.icon className="h-5 w-5" />
                    {section.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 md:grid-cols-2">
                    {section.items.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => handleItemClick(section.id, item.id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium">{item.title}</h4>
                            <p className="text-sm text-muted-foreground mt-1">
                              {item.description}
                            </p>
                          </div>
                          {item.badge && (
                            <Badge variant="secondary" className="ml-2">
                              {item.badge}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          /* Documentation Sections */
          <div className="grid gap-6 lg:grid-cols-2">
            {sections.map((section) => (
              <Card key={section.id} className="transition-all duration-200 hover:shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                      <section.icon className="h-5 w-5" />
                    </div>
                    {section.title}
                  </CardTitle>
                  <p className="text-muted-foreground">{section.description}</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {section.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors group"
                        onClick={() => handleItemClick(section.id, item.id)}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{item.title}</h4>
                            {item.badge && (
                              <Badge variant="secondary" className="text-xs">
                                {item.badge}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {item.description}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Quick Links */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Links</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <Button variant="outline" className="h-auto p-4 justify-start">
                <div className="flex items-center space-x-3">
                  <BookOpen className="h-6 w-6 text-blue-500" />
                  <div className="text-left">
                    <div className="font-medium">User Guide</div>
                    <div className="text-sm text-muted-foreground">Complete user manual</div>
                  </div>
                </div>
              </Button>
              
              <Button variant="outline" className="h-auto p-4 justify-start">
                <div className="flex items-center space-x-3">
                  <Code className="h-6 w-6 text-green-500" />
                  <div className="text-left">
                    <div className="font-medium">API Docs</div>
                    <div className="text-sm text-muted-foreground">Developer reference</div>
                  </div>
                </div>
              </Button>
              
              <Button variant="outline" className="h-auto p-4 justify-start">
                <div className="flex items-center space-x-3">
                  <ExternalLink className="h-6 w-6 text-purple-500" />
                  <div className="text-left">
                    <div className="font-medium">Support</div>
                    <div className="text-sm text-muted-foreground">Get help & contact us</div>
                  </div>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Help Section */}
        <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                Need more help?
              </h3>
              <p className="text-blue-800 dark:text-blue-200">
                Can't find what you're looking for? Our support team is here to help.
              </p>
              <div className="flex items-center justify-center gap-4">
                <Button className="bg-blue-600 hover:bg-blue-700">
                  Contact Support
                </Button>
                <Button variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-100">
                  Community Forum
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}