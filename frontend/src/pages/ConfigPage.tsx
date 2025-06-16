import React, { useState, useEffect } from 'react';
import { Save, TestTube, Trash2, CheckCircle, XCircle, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import brain from 'brain';
import { useSearchParams } from 'react-router-dom';

interface EmailConfig {
  imap_server: string;
  username: string;
  port: number;
  use_ssl: boolean;
  enabled: boolean;
  is_configured: boolean;
  last_test?: string;
  test_status?: string;
}

interface WebhookEmailConfig {
  imap_server: string;
  username: string;
  port: number;
  use_ssl: boolean;
  enabled: boolean;
  is_configured: boolean;
  last_test?: string;
  test_status?: string;
}

interface TestResult {
  success: boolean;
  message: string;
  details?: string;
}

const ConfigPage = () => {
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get('tab') || 'imap';
  
  // IMAP Configuration State
  const [config, setConfig] = useState<EmailConfig>({
    imap_server: '',
    username: '',
    port: 993,
    use_ssl: true,
    enabled: true,
    is_configured: false
  });
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Webhook Configuration State
  const [webhookConfig, setWebhookConfig] = useState<WebhookEmailConfig>({
    imap_server: '',
    username: '',
    port: 993,
    use_ssl: true,
    enabled: true,
    is_configured: false
  });
  const [webhookPassword, setWebhookPassword] = useState('');
  const [webhookLoading, setWebhookLoading] = useState(true);
  const [webhookSaving, setWebhookSaving] = useState(false);
  const [webhookTesting, setWebhookTesting] = useState(false);
  const [webhookTestResult, setWebhookTestResult] = useState<TestResult | null>(null);
  const [showWebhookPassword, setShowWebhookPassword] = useState(false);

  useEffect(() => {
    Promise.all([loadConfig(), loadWebhookConfig()]);
  }, []);

  const loadConfig = async () => {
    try {
      const response = await brain.get_email_config2();
      const data = await response.json();
      setConfig({
        imap_server: data.imap_server || '',
        username: data.username || '',
        port: data.port || 993,
        use_ssl: true, // Default value since not returned from API
        enabled: true, // Default value since not returned from API
        is_configured: data.is_configured || false,
        last_test: data.last_updated,
        test_status: undefined // Not available from this API
      });
      
      // Don't set password from response for security
      setPassword('');
    } catch (error) {
      console.error('Error loading config:', error);
      toast.error('Failed to load configuration');
    } finally {
      setLoading(false);
    }
  };

  const loadWebhookConfig = async () => {
    try {
      const response = await brain.get_webhook_email_config();
      const data = await response.json();
      setWebhookConfig({
        imap_server: data.imap_server || '',
        username: data.username || '',
        port: data.port || 993,
        use_ssl: data.use_ssl !== undefined ? data.use_ssl : true,
        enabled: data.enabled !== undefined ? data.enabled : true,
        is_configured: data.is_configured || false,
        last_test: data.last_test,
        test_status: data.test_status
      });
      
      // Don't set password from response for security
      setWebhookPassword('');
    } catch (error) {
      console.error('Error loading webhook config:', error);
      toast.error('Failed to load webhook configuration');
    } finally {
      setWebhookLoading(false);
    }
  };

  const saveConfig = async () => {
    if (!config.imap_server || !config.username) {
      toast.error('Please fill in server and username');
      return;
    }

    // If not configured yet, password is required
    if (!config.is_configured && !password) {
      toast.error('Password is required for new configurations');
      return;
    }

    setSaving(true);
    try {
      const updateData = {
        imap_server: config.imap_server,
        username: config.username,
        password: password || undefined, // Only send password if provided
        port: config.port,
        use_ssl: config.use_ssl,
        enabled: config.enabled
      };

      await brain.update_email_config2(updateData);
      toast.success('Email configuration saved successfully');
      
      // Reload config to get updated status
      await loadConfig();
      
      // Clear password field for security
      setPassword('');
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    if (!config.imap_server || !config.username || !password) {
      toast.error('Please fill in all fields before testing');
      return;
    }

    setTesting(true);
    setTestResult(null);
    
    try {
      const testData = {
        imap_server: config.imap_server,
        username: config.username,
        password: password,
        port: config.port
      };

      const response = await brain.test_email_connection2(testData);
      const result = await response.json();
      
      setTestResult(result);
      
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Error testing connection:', error);
      const errorResult: TestResult = {
        success: false,
        message: 'Connection test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      };
      setTestResult(errorResult);
      toast.error('Connection test failed');
    } finally {
      setTesting(false);
    }
  };

  const clearConfig = async () => {
    if (!confirm('Are you sure you want to clear all email configuration? This cannot be undone.')) {
      return;
    }

    try {
      await brain.clear_email_config2();
      toast.success('Email configuration cleared');
      
      // Reset form
      setConfig({
        imap_server: '',
        username: '',
        port: 993,
        use_ssl: true,
        enabled: true,
        is_configured: false
      });
      setPassword('');
      setTestResult(null);
    } catch (error) {
      console.error('Error clearing config:', error);
      toast.error('Failed to clear configuration');
    }
  };

  // Webhook configuration functions
  const saveWebhookConfig = async () => {
    if (!webhookConfig.imap_server || !webhookConfig.username) {
      toast.error('Please fill in server and username');
      return;
    }

    // If not configured yet, password is required
    if (!webhookConfig.is_configured && !webhookPassword) {
      toast.error('Password is required for new configurations');
      return;
    }

    setWebhookSaving(true);
    try {
      const updateData = {
        imap_server: webhookConfig.imap_server,
        username: webhookConfig.username,
        password: webhookPassword || undefined, // Only send password if provided
        port: webhookConfig.port,
        use_ssl: webhookConfig.use_ssl,
        enabled: webhookConfig.enabled
      };

      await brain.update_webhook_email_config(updateData);
      toast.success('Webhook email configuration saved successfully');
      
      // Reload config to get updated status
      await loadWebhookConfig();
      
      // Clear password field for security
      setWebhookPassword('');
    } catch (error) {
      console.error('Error saving webhook config:', error);
      toast.error('Failed to save webhook configuration');
    } finally {
      setWebhookSaving(false);
    }
  };

  const testWebhookConnection = async () => {
    if (!webhookConfig.is_configured) {
      toast.error('Please save configuration before testing');
      return;
    }

    setWebhookTesting(true);
    setWebhookTestResult(null);
    
    try {
      const response = await brain.test_webhook_connection();
      const result = await response.json();
      
      setWebhookTestResult(result);
      
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Error testing webhook connection:', error);
      const errorResult: TestResult = {
        success: false,
        message: 'Connection test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      };
      setWebhookTestResult(errorResult);
      toast.error('Connection test failed');
    } finally {
      setWebhookTesting(false);
    }
  };

  const clearWebhookConfig = async () => {
    if (!confirm('Are you sure you want to clear webhook email configuration? This cannot be undone.')) {
      return;
    }

    try {
      await brain.clear_webhook_email_config();
      toast.success('Webhook email configuration cleared');
      
      // Reset form
      setWebhookConfig({
        imap_server: '',
        username: '',
        port: 993,
        use_ssl: true,
        enabled: true,
        is_configured: false
      });
      setWebhookPassword('');
      setWebhookTestResult(null);
    } catch (error) {
      console.error('Error clearing webhook config:', error);
      toast.error('Failed to clear webhook configuration');
    }
  };

  if (loading || webhookLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading configuration...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Settings className="w-8 h-8" />
            Konfigurasjon
          </h1>
          <p className="text-muted-foreground mt-2">
            Administrer e-post innstillinger og andre systemkonfigurasjoner
          </p>
        </div>
      </div>

      <Tabs defaultValue={defaultTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="imap">IMAP Konfigurasjon</TabsTrigger>
          <TabsTrigger value="webhook">Webhook Konfigurasjon</TabsTrigger>
        </TabsList>

        {/* IMAP Configuration Tab */}
        <TabsContent value="imap" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    IMAP E-post Konfigurasjon
                    {config.is_configured ? (
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Konfigurert
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <XCircle className="w-3 h-3 mr-1" />
                        Ikke konfigurert
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    Sett opp IMAP innstillinger for automatisk e-post mottak på emailparser@digitool.no.
                    Dette er separat fra webhook systemet som bruker mottak@digitool.no.
                  </CardDescription>
                </div>
                {config.is_configured && (
                  <Button variant="outline" size="sm" onClick={clearConfig}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Fjern konfigurasjon
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Connection Status */}
              {config.last_test && (
                <div className="p-4 rounded-lg border bg-muted/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Siste tilkoblingstest</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(config.last_test).toLocaleString('no-NO')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {config.test_status === 'success' ? (
                        <Badge variant="default" className="bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Vellykket
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <XCircle className="w-3 h-3 mr-1" />
                          Feilet
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Test Result */}
              {testResult && (
                <div className={`p-4 rounded-lg border ${
                  testResult.success 
                    ? 'border-green-200 bg-green-50 text-green-800' 
                    : 'border-red-200 bg-red-50 text-red-800'
                }`}>
                  <div className="flex items-start gap-2">
                    {testResult.success ? (
                      <CheckCircle className="w-5 h-5 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 mt-0.5" />
                    )}
                    <div>
                      <p className="font-medium">{testResult.message}</p>
                      {testResult.details && (
                        <p className="text-sm mt-1 opacity-90">{testResult.details}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Configuration Form */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="imap-server">IMAP Server *</Label>
                  <Input
                    id="imap-server"
                    value={config.imap_server}
                    onChange={(e) => setConfig(prev => ({ ...prev, imap_server: e.target.value }))}
                    placeholder="imap.example.com"
                  />
                </div>
                
                <div>
                  <Label htmlFor="port">Port</Label>
                  <Input
                    id="port"
                    type="number"
                    value={config.port}
                    onChange={(e) => setConfig(prev => ({ ...prev, port: parseInt(e.target.value) || 993 }))}
                    placeholder="993"
                  />
                </div>
                
                <div>
                  <Label htmlFor="username">Brukernavn *</Label>
                  <Input
                    id="username"
                    value={config.username}
                    onChange={(e) => setConfig(prev => ({ ...prev, username: e.target.value }))}
                    placeholder="din-epost@example.com"
                  />
                </div>
                
                <div>
                  <Label htmlFor="password">Passord *</Label>
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={config.is_configured ? "Skriv inn nytt passord (eller la stå tom for å beholde eksisterende)" : "Skriv inn passord"}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={config.use_ssl}
                    onCheckedChange={(checked) => setConfig(prev => ({ ...prev, use_ssl: checked }))}
                  />
                  <Label>Bruk SSL/TLS</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={config.enabled}
                    onCheckedChange={(checked) => setConfig(prev => ({ ...prev, enabled: checked }))}
                  />
                  <Label>Aktiver automatisk e-post sjekking</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={showPassword}
                    onCheckedChange={setShowPassword}
                  />
                  <Label>Vis passord</Label>
                </div>
              </div>

              <Separator />

              <div className="flex gap-2">
                <Button 
                  onClick={testConnection} 
                  variant="outline"
                  disabled={testing || !config.imap_server || !config.username || !password}
                >
                  <TestTube className="w-4 h-4 mr-2" />
                  {testing ? 'Tester...' : 'Test tilkobling'}
                </Button>
                
                <Button 
                  onClick={saveConfig}
                  disabled={saving || !config.imap_server || !config.username || (!config.is_configured && !password)}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? 'Lagrer...' : 'Lagre konfigurasjon'}
                </Button>
              </div>

              {/* Help Text */}
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Vanlige IMAP innstillinger:</h4>
                <div className="text-sm text-blue-800 space-y-1">
                  <p><strong>Gmail:</strong> imap.gmail.com:993 (SSL)</p>
                  <p><strong>Outlook/Hotmail:</strong> outlook.office365.com:993 (SSL)</p>
                  <p><strong>Domeneshop:</strong> imap.domeneshop.no:993 (SSL)</p>
                  <p className="mt-2 text-xs">
                    <strong>Tips:</strong> Du må kanskje aktivere "App-spesifikke passord" for Gmail og Outlook.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Webhook Configuration Tab */}
        <TabsContent value="webhook" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    Webhook E-post Konfigurasjon
                    {webhookConfig.is_configured ? (
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Konfigurert
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <XCircle className="w-3 h-3 mr-1" />
                        Ikke konfigurert
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    Sett opp webhook e-post innstillinger for automatisk mottak på mottak@digitool.no.
                    Dette er separat fra IMAP systemet som bruker emailparser@digitool.no.
                  </CardDescription>
                </div>
                {webhookConfig.is_configured && (
                  <Button variant="outline" size="sm" onClick={clearWebhookConfig}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Fjern konfigurasjon
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Connection Status */}
              {webhookConfig.last_test && (
                <div className="p-4 rounded-lg border bg-muted/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Siste tilkoblingstest</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(webhookConfig.last_test).toLocaleString('no-NO')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {webhookConfig.test_status === 'success' ? (
                        <Badge variant="default" className="bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Vellykket
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <XCircle className="w-3 h-3 mr-1" />
                          Feilet
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Test Result */}
              {webhookTestResult && (
                <div className={`p-4 rounded-lg border ${
                  webhookTestResult.success 
                    ? 'border-green-200 bg-green-50 text-green-800' 
                    : 'border-red-200 bg-red-50 text-red-800'
                }`}>
                  <div className="flex items-start gap-2">
                    {webhookTestResult.success ? (
                      <CheckCircle className="w-5 h-5 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 mt-0.5" />
                    )}
                    <div>
                      <p className="font-medium">{webhookTestResult.message}</p>
                      {webhookTestResult.details && (
                        <p className="text-sm mt-1 opacity-90">{webhookTestResult.details}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Configuration Form */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="webhook-imap-server">IMAP Server *</Label>
                  <Input
                    id="webhook-imap-server"
                    value={webhookConfig.imap_server}
                    onChange={(e) => setWebhookConfig(prev => ({ ...prev, imap_server: e.target.value }))}
                    placeholder="imap.example.com"
                  />
                </div>
                
                <div>
                  <Label htmlFor="webhook-port">Port</Label>
                  <Input
                    id="webhook-port"
                    type="number"
                    value={webhookConfig.port}
                    onChange={(e) => setWebhookConfig(prev => ({ ...prev, port: parseInt(e.target.value) || 993 }))}
                    placeholder="993"
                  />
                </div>
                
                <div>
                  <Label htmlFor="webhook-username">Brukernavn *</Label>
                  <Input
                    id="webhook-username"
                    value={webhookConfig.username}
                    onChange={(e) => setWebhookConfig(prev => ({ ...prev, username: e.target.value }))}
                    placeholder="mottak@digitool.no"
                  />
                </div>
                
                <div>
                  <Label htmlFor="webhook-password">Passord *</Label>
                  <Input
                    id="webhook-password"
                    type={showWebhookPassword ? "text" : "password"}
                    value={webhookPassword}
                    onChange={(e) => setWebhookPassword(e.target.value)}
                    placeholder={webhookConfig.is_configured ? "Skriv inn nytt passord (eller la stå tom for å beholde eksisterende)" : "Skriv inn passord"}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={webhookConfig.use_ssl}
                    onCheckedChange={(checked) => setWebhookConfig(prev => ({ ...prev, use_ssl: checked }))}
                  />
                  <Label>Bruk SSL/TLS</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={webhookConfig.enabled}
                    onCheckedChange={(checked) => setWebhookConfig(prev => ({ ...prev, enabled: checked }))}
                  />
                  <Label>Aktiver webhook e-post mottak</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={showWebhookPassword}
                    onCheckedChange={setShowWebhookPassword}
                  />
                  <Label>Vis passord</Label>
                </div>
              </div>

              <Separator />

              <div className="flex gap-2">
                <Button 
                  onClick={testWebhookConnection} 
                  variant="outline"
                  disabled={webhookTesting || !webhookConfig.is_configured}
                >
                  <TestTube className="w-4 h-4 mr-2" />
                  {webhookTesting ? 'Tester...' : 'Test tilkobling'}
                </Button>
                
                <Button 
                  onClick={saveWebhookConfig}
                  disabled={webhookSaving || !webhookConfig.imap_server || !webhookConfig.username || (!webhookConfig.is_configured && !webhookPassword)}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {webhookSaving ? 'Lagrer...' : 'Lagre konfigurasjon'}
                </Button>
              </div>

              {/* Help Text */}
              <div className="mt-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <h4 className="font-medium text-orange-900 mb-2">Webhook E-post Oppsett:</h4>
                <div className="text-sm text-orange-800 space-y-1">
                  <p><strong>Standard:</strong> mottak@digitool.no (imap.domeneshop.no:993)</p>
                  <p>Dette systemet mottar e-post via webhook og prosesserer dem automatisk.</p>
                  <p className="mt-2 text-xs">
                    <strong>Merk:</strong> Webhook systemet krever samme IMAP tilgang som direkte e-post mottak.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Future Configuration Sections */}
      <Card>
        <CardHeader>
          <CardTitle>Andre innstillinger</CardTitle>
          <CardDescription>
            Flere konfigurasjonsalternativer kommer snart
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Fremtidige funksjoner:</p>
          <ul className="list-disc list-inside text-sm text-muted-foreground mt-2 space-y-1">
            <li>OpenAI API konfigurasjon</li>
            <li>Automatisk sjekking intervall</li>
            <li>Notification innstillinger</li>
            <li>Data eksport innstillinger</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default ConfigPage;