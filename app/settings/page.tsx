'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { 
  Settings as SettingsIcon, 
  Bell, 
  Moon, 
  Globe, 
  Database,
  Download,
  Shield,
  Trash2,
  Save,
  RefreshCw
} from 'lucide-react';
import { ModernHeader } from '@/components/layout/modern-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Separator } from '@/components/ui/separator';
import { useTheme } from '@/components/theme-provider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface UserSettings {
  notifications: {
    email: boolean;
    browser: boolean;
    dataUpdates: boolean;
    securityAlerts: boolean;
    weeklyReports: boolean;
  };
  appearance: {
    theme: string;
    language: string;
    timezone: string;
  };
  data: {
    autoSave: boolean;
    defaultExportFormat: string;
    cacheEnabled: boolean;
    retentionDays: number;
  };
  privacy: {
    shareUsageStats: boolean;
    allowAnalytics: boolean;
    showOnlineStatus: boolean;
  };
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  
  const [settings, setSettings] = useState<UserSettings>({
    notifications: {
      email: true,
      browser: true,
      dataUpdates: true,
      securityAlerts: true,
      weeklyReports: false,
    },
    appearance: {
      theme: 'system',
      language: 'en',
      timezone: 'UTC',
    },
    data: {
      autoSave: true,
      defaultExportFormat: 'csv',
      cacheEnabled: true,
      retentionDays: 30,
    },
    privacy: {
      shareUsageStats: false,
      allowAnalytics: true,
      showOnlineStatus: true,
    },
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/user/settings');
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/user/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (!response.ok) throw new Error('Failed to save settings');

      toast({
        title: 'Settings saved',
        description: 'Your preferences have been updated successfully.',
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save settings.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme as any);
    setSettings(prev => ({
      ...prev,
      appearance: { ...prev.appearance, theme: newTheme }
    }));
  };

  const clearCache = async () => {
    try {
      const response = await fetch('/api/user/cache', { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to clear cache');
      
      toast({
        title: 'Cache cleared',
        description: 'Browser cache has been cleared successfully.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to clear cache.',
        variant: 'destructive',
      });
    }
  };

  const exportData = async () => {
    try {
      const response = await fetch('/api/user/export');
      if (!response.ok) throw new Error('Failed to export data');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `user-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: 'Data exported',
        description: 'Your data has been downloaded successfully.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to export data.',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <ModernHeader />
        <div className="container mx-auto py-8 px-4">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading settings...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <ModernHeader />
      <div className="container mx-auto py-6 space-y-6 px-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
            <p className="text-muted-foreground">
              Customize your experience and preferences
            </p>
          </div>
          <Button onClick={saveSettings} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="email-notifications">Email notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications via email
                  </p>
                </div>
                <Switch
                  id="email-notifications"
                  checked={settings.notifications.email}
                  onCheckedChange={(checked) =>
                    setSettings(prev => ({
                      ...prev,
                      notifications: { ...prev.notifications, email: checked }
                    }))
                  }
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="browser-notifications">Browser notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Show notifications in your browser
                  </p>
                </div>
                <Switch
                  id="browser-notifications"
                  checked={settings.notifications.browser}
                  onCheckedChange={(checked) =>
                    setSettings(prev => ({
                      ...prev,
                      notifications: { ...prev.notifications, browser: checked }
                    }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="data-updates">Data updates</Label>
                  <p className="text-sm text-muted-foreground">
                    Notify when new data is available
                  </p>
                </div>
                <Switch
                  id="data-updates"
                  checked={settings.notifications.dataUpdates}
                  onCheckedChange={(checked) =>
                    setSettings(prev => ({
                      ...prev,
                      notifications: { ...prev.notifications, dataUpdates: checked }
                    }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="security-alerts">Security alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Important security notifications
                  </p>
                </div>
                <Switch
                  id="security-alerts"
                  checked={settings.notifications.securityAlerts}
                  onCheckedChange={(checked) =>
                    setSettings(prev => ({
                      ...prev,
                      notifications: { ...prev.notifications, securityAlerts: checked }
                    }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="weekly-reports">Weekly reports</Label>
                  <p className="text-sm text-muted-foreground">
                    Weekly activity summaries
                  </p>
                </div>
                <Switch
                  id="weekly-reports"
                  checked={settings.notifications.weeklyReports}
                  onCheckedChange={(checked) =>
                    setSettings(prev => ({
                      ...prev,
                      notifications: { ...prev.notifications, weeklyReports: checked }
                    }))
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Appearance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Moon className="h-5 w-5" />
                Appearance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Theme</Label>
                <Select value={settings.appearance.theme} onValueChange={handleThemeChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select theme" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Language</Label>
                <Select
                  value={settings.appearance.language}
                  onValueChange={(value) =>
                    setSettings(prev => ({
                      ...prev,
                      appearance: { ...prev.appearance, language: value }
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Español</SelectItem>
                    <SelectItem value="fr">Français</SelectItem>
                    <SelectItem value="de">Deutsch</SelectItem>
                    <SelectItem value="it">Italiano</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Timezone</Label>
                <Select
                  value={settings.appearance.timezone}
                  onValueChange={(value) =>
                    setSettings(prev => ({
                      ...prev,
                      appearance: { ...prev.appearance, timezone: value }
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UTC">UTC</SelectItem>
                    <SelectItem value="America/New_York">Eastern Time</SelectItem>
                    <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                    <SelectItem value="Europe/London">London</SelectItem>
                    <SelectItem value="Europe/Paris">Paris</SelectItem>
                    <SelectItem value="Europe/Rome">Rome</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Data & Storage */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Data & Storage
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="auto-save">Auto-save work</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically save your progress
                  </p>
                </div>
                <Switch
                  id="auto-save"
                  checked={settings.data.autoSave}
                  onCheckedChange={(checked) =>
                    setSettings(prev => ({
                      ...prev,
                      data: { ...prev.data, autoSave: checked }
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Default export format</Label>
                <Select
                  value={settings.data.defaultExportFormat}
                  onValueChange={(value) =>
                    setSettings(prev => ({
                      ...prev,
                      data: { ...prev.data, defaultExportFormat: value }
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="csv">CSV</SelectItem>
                    <SelectItem value="json">JSON</SelectItem>
                    <SelectItem value="xlsx">Excel</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="cache-enabled">Enable caching</Label>
                  <p className="text-sm text-muted-foreground">
                    Cache data for faster loading
                  </p>
                </div>
                <Switch
                  id="cache-enabled"
                  checked={settings.data.cacheEnabled}
                  onCheckedChange={(checked) =>
                    setSettings(prev => ({
                      ...prev,
                      data: { ...prev.data, cacheEnabled: checked }
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Cache & Data Management</Label>
                  <Button variant="outline" size="sm" onClick={clearCache}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Clear Cache
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Privacy */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Privacy
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="share-stats">Share usage statistics</Label>
                  <p className="text-sm text-muted-foreground">
                    Help improve the platform
                  </p>
                </div>
                <Switch
                  id="share-stats"
                  checked={settings.privacy.shareUsageStats}
                  onCheckedChange={(checked) =>
                    setSettings(prev => ({
                      ...prev,
                      privacy: { ...prev.privacy, shareUsageStats: checked }
                    }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="allow-analytics">Allow analytics</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable usage analytics
                  </p>
                </div>
                <Switch
                  id="allow-analytics"
                  checked={settings.privacy.allowAnalytics}
                  onCheckedChange={(checked) =>
                    setSettings(prev => ({
                      ...prev,
                      privacy: { ...prev.privacy, allowAnalytics: checked }
                    }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="online-status">Show online status</Label>
                  <p className="text-sm text-muted-foreground">
                    Let others see when you're online
                  </p>
                </div>
                <Switch
                  id="online-status"
                  checked={settings.privacy.showOnlineStatus}
                  onCheckedChange={(checked) =>
                    setSettings(prev => ({
                      ...prev,
                      privacy: { ...prev.privacy, showOnlineStatus: checked }
                    }))
                  }
                />
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Export your data</Label>
                    <p className="text-sm text-muted-foreground">
                      Download all your data
                    </p>
                  </div>
                  <Button variant="outline" onClick={exportData}>
                    <Download className="mr-2 h-4 w-4" />
                    Export Data
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Delete account</Label>
                    <p className="text-sm text-muted-foreground">
                      Permanently delete your account
                    </p>
                  </div>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Account
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}