'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Database, AlertCircle, Eye, UserPlus, LogIn, HelpCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  // Login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Registration state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regRole, setRegRole] = useState('researcher');
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState('');

  // Guest access loading
  const [guestLoading, setGuestLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);

    try {
      const result = await signIn('credentials', {
        email: loginEmail,
        password: loginPassword,
        redirect: false,
      });

      if (result?.error) {
        setLoginError('Invalid email or password');
      } else {
        router.push('/');
        router.refresh();
      }
    } catch (error) {
      setLoginError('An error occurred. Please try again.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');

    // Basic validation
    if (regPassword !== regConfirmPassword) {
      setRegError('Passwords do not match');
      return;
    }

    if (regPassword.length < 8) {
      setRegError('Password must be at least 8 characters long');
      return;
    }

    setRegLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: regName,
          email: regEmail,
          password: regPassword,
          role: regRole,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      toast({
        title: 'Registration successful',
        description: 'You can now sign in with your credentials.',
      });

      // Clear form and switch to login tab
      setRegName('');
      setRegEmail('');
      setRegPassword('');
      setRegConfirmPassword('');
      
      // Switch to login tab
      const loginTab = document.querySelector('[data-value="login"]') as HTMLButtonElement;
      if (loginTab) loginTab.click();

    } catch (error) {
      setRegError(error instanceof Error ? error.message : 'Registration failed');
    } finally {
      setRegLoading(false);
    }
  };

  const handleGuestAccess = async () => {
    setGuestLoading(true);

    try {
      const response = await fetch('/api/auth/guest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Guest access failed');
      }

      // Sign in with the guest credentials
      const result = await signIn('credentials', {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        throw new Error('Failed to authenticate guest user');
      }

      toast({
        title: 'Guest access granted',
        description: 'You are now browsing as a guest user.',
      });

      router.push('/');
      router.refresh();

    } catch (error) {
      toast({
        title: 'Guest access failed',
        description: error instanceof Error ? error.message : 'Unable to create guest session',
        variant: 'destructive',
      });
    } finally {
      setGuestLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
            <Database className="text-white" size={32} />
          </div>
          <h1 className="text-3xl font-bold">Genomics Platform</h1>
          <p className="text-muted-foreground mt-2">
            Advanced genomic data visualization and analysis
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Welcome</CardTitle>
            <CardDescription>
              Sign in to your account, register, or browse as a guest
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login" data-value="login">
                  <LogIn className="w-4 h-4 mr-2" />
                  Sign In
                </TabsTrigger>
                <TabsTrigger value="register">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Register
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="space-y-4">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@institution.edu"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                    />
                  </div>

                  {loginError && (
                    <div className="flex items-center gap-2 text-sm text-red-600">
                      <AlertCircle size={16} />
                      <span>{loginError}</span>
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loginLoading}
                  >
                    {loginLoading ? 'Signing in...' : 'Sign In'}
                  </Button>
                </form>

                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="text-blue-600 mt-0.5" size={16} />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium mb-1">Demo Access</p>
                      <p className="text-xs">
                        Email: admin@genomics.local<br />
                        Password: admin123!
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="register" className="space-y-4">
                <form onSubmit={handleRegistration} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reg-name">Full Name</Label>
                    <Input
                      id="reg-name"
                      type="text"
                      placeholder="Dr. John Smith"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reg-email">Email</Label>
                    <Input
                      id="reg-email"
                      type="email"
                      placeholder="you@institution.edu"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="reg-password">Password</Label>
                    <Input
                      id="reg-password"
                      type="password"
                      placeholder="••••••••"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      required
                      minLength={8}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reg-confirm-password">Confirm Password</Label>
                    <Input
                      id="reg-confirm-password"
                      type="password"
                      placeholder="••••••••"
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="reg-role">Account Type</Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <div className="space-y-2 text-xs">
                              <div><strong>Researcher:</strong> Full platform access for data analysis</div>
                              <div><strong>Clinician:</strong> Clinical-focused variant interpretation</div>
                              <div><strong>Viewer:</strong> Read-only browsing of public data</div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Select value={regRole} onValueChange={setRegRole}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select account type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="researcher">
                          <div className="flex flex-col">
                            <span className="font-medium">Researcher</span>
                            <span className="text-xs text-muted-foreground">
                              Full access: import data, run analysis, export results
                            </span>
                          </div>
                        </SelectItem>
                        <SelectItem value="clinician">
                          <div className="flex flex-col">
                            <span className="font-medium">Clinician</span>
                            <span className="text-xs text-muted-foreground">
                              Clinical focus: view variants, clinical annotations
                            </span>
                          </div>
                        </SelectItem>
                        <SelectItem value="viewer">
                          <div className="flex flex-col">
                            <span className="font-medium">Viewer</span>
                            <span className="text-xs text-muted-foreground">
                              Read-only: browse genes and variants, no data import
                            </span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="text-xs text-muted-foreground mt-1">
                      💡 Choose based on your intended use of the platform
                    </div>
                  </div>

                  {regError && (
                    <div className="flex items-center gap-2 text-sm text-red-600">
                      <AlertCircle size={16} />
                      <span>{regError}</span>
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={regLoading}
                  >
                    {regLoading ? 'Creating Account...' : 'Create Account'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            {/* Guest Access Section */}
            <div className="mt-6 pt-6 border-t">
              <div className="text-center space-y-4">
                <div className="text-sm text-muted-foreground">
                  Don't want to create an account?
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleGuestAccess}
                  disabled={guestLoading}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  {guestLoading ? 'Setting up guest access...' : 'Browse as Guest'}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Guest access provides read-only viewing of public data
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}