'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Trash2, Edit, Plus, Settings, Link as LinkIcon, Eye, EyeOff } from 'lucide-react'

interface ChatraAccount {
  id: string
  name: string
  chatraId: string
  apiKey: string
  webhookSecret: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  _count: {
    conversations: number
  }
}

interface ChatraAccountManagerProps {
  accounts: ChatraAccount[]
  stats: {
    totalAccounts: number
    activeAccounts: number
    totalConversations: number
  }
  currentDomain: string
}

export function ChatraAccountManager({ accounts, stats, currentDomain }: ChatraAccountManagerProps) {
  const [selectedAccount, setSelectedAccount] = useState<ChatraAccount | null>(null)
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [showWebhookInfo, setShowWebhookInfo] = useState(false)
  const [visibleSecrets, setVisibleSecrets] = useState<Set<string>>(new Set())

  const handleAddNew = () => {
    setIsAddingNew(true)
    setSelectedAccount(null)
  }

  const handleEdit = (account: ChatraAccount) => {
    setSelectedAccount(account)
    setIsAddingNew(false)
  }

  const handleDelete = async (accountId: string) => {
    if (!confirm('Are you sure you want to delete this Chatra account? This will also delete all associated conversations.')) {
      return
    }
    
    try {
      const { deleteChatraAccount } = await import('@/lib/chatra-actions')
      await deleteChatraAccount(accountId)
      window.location.reload()
    } catch (error) {
      console.error('Error deleting account:', error)
      alert('Failed to delete account. Please try again.')
    }
  }

  const toggleSecretVisibility = (accountId: string) => {
    const newVisible = new Set(visibleSecrets)
    if (newVisible.has(accountId)) {
      newVisible.delete(accountId)
    } else {
      newVisible.add(accountId)
    }
    setVisibleSecrets(newVisible)
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      alert('Copied to clipboard!')
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const webhookUrl = `${currentDomain}/api/chatra-webhook`

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Accounts</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.totalAccounts}</div>
            <p className="text-xs text-muted-foreground">Chatra accounts configured</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Accounts</CardTitle>
            <Badge variant={stats.activeAccounts > 0 ? "default" : "secondary"}>
              {stats.activeAccounts}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.activeAccounts}</div>
            <p className="text-xs text-muted-foreground">Currently receiving webhooks</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Conversations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.totalConversations}</div>
            <p className="text-xs text-muted-foreground">Across all accounts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Webhook URL</CardTitle>
            <LinkIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowWebhookInfo(true)}
              className="text-xs"
            >
              View Setup
            </Button>
            <p className="text-xs text-muted-foreground mt-1">Configure in Chatra</p>
          </CardContent>
        </Card>
      </div>

      {/* Account Management */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Chatra Accounts</CardTitle>
              <CardDescription>
                Manage your Chatra account integrations and webhook configurations
              </CardDescription>
            </div>
            <Button onClick={handleAddNew}>
              <Plus className="h-4 w-4 mr-2" />
              Add Account
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {accounts.length === 0 ? (
            <div className="text-center py-12">
              <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Chatra accounts configured</h3>
              <p className="text-gray-600 mb-4">Add your first Chatra account to start managing conversations</p>
              <Button onClick={handleAddNew}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Account
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account Name</TableHead>
                  <TableHead>Chatra ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Conversations</TableHead>
                  <TableHead>API Key</TableHead>
                  <TableHead>Webhook Secret</TableHead>
                  <TableHead className="w-32">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell className="font-medium">{account.name}</TableCell>
                    <TableCell>
                      <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                        {account.chatraId}
                      </code>
                    </TableCell>
                    <TableCell>
                      <Badge variant={account.isActive ? "default" : "secondary"}>
                        {account.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>{account._count.conversations}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                          {visibleSecrets.has(account.id) 
                            ? account.apiKey 
                            : '••••••••••••••••'
                          }
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleSecretVisibility(account.id)}
                        >
                          {visibleSecrets.has(account.id) ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                          {visibleSecrets.has(account.id) 
                            ? account.webhookSecret 
                            : '••••••••••••••••'
                          }
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleSecretVisibility(account.id)}
                        >
                          {visibleSecrets.has(account.id) ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(account)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(account.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Account Dialog */}
      <AccountDialog 
        account={selectedAccount}
        isOpen={isAddingNew || !!selectedAccount}
        onClose={() => {
          setIsAddingNew(false)
          setSelectedAccount(null)
        }}
        isNew={isAddingNew}
      />

      {/* Webhook Setup Dialog */}
      <WebhookSetupDialog
        isOpen={showWebhookInfo}
        onClose={() => setShowWebhookInfo(false)}
        webhookUrl={webhookUrl}
        onCopy={() => copyToClipboard(webhookUrl)}
      />
    </div>
  )
}

// Account Dialog Component
interface AccountDialogProps {
  account: ChatraAccount | null
  isOpen: boolean
  onClose: () => void
  isNew: boolean
}

function AccountDialog({ account, isOpen, onClose, isNew }: AccountDialogProps) {
  const [name, setName] = useState(account?.name || '')
  const [chatraId, setChatraId] = useState(account?.chatraId || '')
  const [apiKey, setApiKey] = useState(account?.apiKey || '')
  const [webhookSecret, setWebhookSecret] = useState(account?.webhookSecret || '')
  const [isActive, setIsActive] = useState(account?.isActive ?? true)

  const handleSave = async () => {
    if (!name.trim() || !chatraId.trim() || !apiKey.trim() || !webhookSecret.trim()) {
      alert('Please fill in all required fields')
      return
    }
    
    try {
      if (isNew) {
        const { addChatraAccount } = await import('@/lib/chatra-actions')
        await addChatraAccount({
          name: name.trim(),
          chatraId: chatraId.trim(),
          apiKey: apiKey.trim(),
          webhookSecret: webhookSecret.trim(),
          isActive
        })
      } else if (account) {
        const { updateChatraAccount } = await import('@/lib/chatra-actions')
        await updateChatraAccount(account.id, {
          name: name.trim(),
          chatraId: chatraId.trim(),
          apiKey: apiKey.trim(),
          webhookSecret: webhookSecret.trim(),
          isActive
        })
      }
      
      onClose()
      window.location.reload()
    } catch (error) {
      console.error('Error saving account:', error)
      alert('Failed to save account. Please try again.')
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isNew ? 'Add New Chatra Account' : 'Edit Chatra Account'}
          </DialogTitle>
          <DialogDescription>
            {isNew 
              ? 'Connect a new Chatra account to receive and manage conversations.' 
              : 'Update your Chatra account configuration.'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Account Name *</Label>
            <Input
              id="name"
              placeholder="e.g., Main Support, Sales Team"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="chatraId">Chatra Account ID *</Label>
            <Input
              id="chatraId"
              placeholder="e.g., ZRX3EvWsmnPNr6m9x"
              value={chatraId}
              onChange={(e) => setChatraId(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="apiKey">API Key *</Label>
            <Textarea
              id="apiKey"
              placeholder="Your Chatra API key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              rows={3}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="webhookSecret">Webhook Secret *</Label>
            <Input
              id="webhookSecret"
              placeholder="Secret key for webhook verification"
              value={webhookSecret}
              onChange={(e) => setWebhookSecret(e.target.value)}
              className="mt-1"
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
            <Label htmlFor="isActive">Account is active</Label>
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {isNew ? 'Add Account' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Webhook Setup Dialog Component
interface WebhookSetupDialogProps {
  isOpen: boolean
  onClose: () => void
  webhookUrl: string
  onCopy: () => void
}

function WebhookSetupDialog({ isOpen, onClose, webhookUrl, onCopy }: WebhookSetupDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Webhook Configuration Guide</DialogTitle>
          <DialogDescription>
            Follow these steps to configure webhooks in your Chatra account
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div>
            <h3 className="font-medium mb-2">1. Copy Your Webhook URL</h3>
            <div className="flex items-center space-x-2">
              <code className="bg-gray-100 p-3 rounded flex-1 text-sm break-all">
                {webhookUrl}
              </code>
              <Button onClick={onCopy} variant="outline" size="sm">
                Copy
              </Button>
            </div>
          </div>

          <div>
            <h3 className="font-medium mb-2">2. Configure in Chatra Dashboard</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
              <li>Log in to your Chatra account dashboard</li>
              <li>Go to <strong>Settings → Integrations → Webhooks</strong></li>
              <li>Click <strong>&quot;Add Webhook&quot;</strong></li>
              <li>Paste the webhook URL above</li>
              <li>Select these events:
                <ul className="list-disc list-inside ml-4 mt-1">
                  <li><code>chat.message</code> - New messages</li>
                  <li><code>chat.started</code> - New conversations</li>
                  <li><code>chat.ended</code> - Ended conversations</li>
                </ul>
              </li>
              <li>Set the webhook secret (use the same value in your account configuration)</li>
              <li>Save the webhook configuration</li>
            </ol>
          </div>

          <div>
            <h3 className="font-medium mb-2">3. Test the Integration</h3>
            <p className="text-sm text-gray-600">
              Send a test message in your Chatra widget to verify that webhooks are being received.
              Check the conversation list in your dashboard to confirm messages are appearing.
            </p>
          </div>

          <div className="flex justify-end">
            <Button onClick={onClose}>Got it!</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 