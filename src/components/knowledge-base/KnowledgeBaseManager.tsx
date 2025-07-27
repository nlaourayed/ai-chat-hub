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
import { Trash2, Edit, Plus, FileText, Download, Upload } from 'lucide-react'
import type { KnowledgeBaseManagerProps, KnowledgeBaseEntry } from '@/types'

export function KnowledgeBaseManager({ entries, stats }: KnowledgeBaseManagerProps) {
  const [selectedEntry, setSelectedEntry] = useState<KnowledgeBaseEntry | null>(null)
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  // Filter entries based on search
  const filteredEntries = entries.filter(entry => 
    entry.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.source.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleAddNew = () => {
    setIsAddingNew(true)
    setSelectedEntry(null)
  }

  const handleEdit = (entry: KnowledgeBaseEntry) => {
    setSelectedEntry(entry)
    setIsAddingNew(false)
  }

  const handleDelete = async (entryId: string) => {
    if (!confirm('Are you sure you want to delete this knowledge base entry?')) {
      return
    }
    
    try {
      const { deleteKnowledgeEntry } = await import('@/lib/knowledge-actions')
      await deleteKnowledgeEntry(entryId)
      window.location.reload() // Simple refresh to show changes
    } catch (error) {
      console.error('Error deleting entry:', error)
      alert('Failed to delete entry. Please try again.')
    }
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Entries</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.totalEntries}</div>
            <p className="text-xs text-muted-foreground">Knowledge base entries</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sources</CardTitle>
            <Badge variant="secondary">{stats.sources.length}</Badge>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {stats.sources.slice(0, 3).map((source) => (
                <div key={source.source} className="flex justify-between text-sm">
                  <span className="capitalize">{source.source.replace('_', ' ')}</span>
                  <span className="font-medium">{source._count.source}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button 
              onClick={handleAddNew}
              className="w-full" 
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Entry
            </Button>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" className="flex-1">
                <Upload className="h-4 w-4 mr-1" />
                Import
              </Button>
              <Button variant="outline" size="sm" className="flex-1">
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Knowledge Base Entries</CardTitle>
          <CardDescription>
            Manage your RAG knowledge base content
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-4 mb-4">
            <Input
              placeholder="Search entries..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
          </div>

          {/* Entries Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Content Preview</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEntries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                      {searchTerm ? 'No entries match your search.' : 'No knowledge base entries found.'}
                      <div className="mt-2">
                        <Button onClick={handleAddNew} variant="outline" size="sm">
                          <Plus className="h-4 w-4 mr-2" />
                          Add your first entry
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="max-w-md">
                        <div className="truncate">
                          {entry.content.substring(0, 100)}
                          {entry.content.length > 100 && '...'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {entry.source.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(entry.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(entry)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(entry.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <EntryDialog 
        entry={selectedEntry}
        isOpen={isAddingNew || !!selectedEntry}
        onClose={() => {
          setIsAddingNew(false)
          setSelectedEntry(null)
        }}
        isNew={isAddingNew}
      />
    </div>
  )
}

interface EntryDialogProps {
  entry: KnowledgeBaseEntry | null
  isOpen: boolean
  onClose: () => void
  isNew: boolean
}

function EntryDialog({ entry, isOpen, onClose, isNew }: EntryDialogProps) {
  const [content, setContent] = useState(entry?.content || '')
  const [source, setSource] = useState(entry?.source || 'manual')
  const [sourceId, setSourceId] = useState(entry?.sourceId || '')

  const handleSave = async () => {
    if (!content.trim()) return
    
    try {
      if (isNew) {
        const { addKnowledgeEntry } = await import('@/lib/knowledge-actions')
        await addKnowledgeEntry({
          content: content.trim(),
          source: source.trim() || 'manual',
          sourceId: sourceId.trim() || undefined,
          metadata: { addedManually: true }
        })
      } else if (entry) {
        const { updateKnowledgeEntry } = await import('@/lib/knowledge-actions')
        await updateKnowledgeEntry(entry.id, {
          content: content.trim(),
          source: source.trim(),
          sourceId: sourceId.trim() || undefined,
          metadata: { 
            ...(entry.metadata as Record<string, unknown> || {}), 
            lastModified: new Date().toISOString() 
          }
        })
      }
      
      onClose()
      window.location.reload() // Simple refresh to show changes
    } catch (error) {
      console.error('Error saving entry:', error)
      alert('Failed to save entry. Please try again.')
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isNew ? 'Add New Knowledge Base Entry' : 'Edit Knowledge Base Entry'}
          </DialogTitle>
          <DialogDescription>
            {isNew ? 'Add a new entry to your RAG knowledge base.' : 'Update this knowledge base entry.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              placeholder="Enter the knowledge content..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="source">Source</Label>
              <Input
                id="source"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="e.g., manual, chatra_conversation"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="sourceId">Source ID (optional)</Label>
              <Input
                id="sourceId"
                value={sourceId}
                onChange={(e) => setSourceId(e.target.value)}
                placeholder="Reference ID"
                className="mt-1"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {isNew ? 'Add Entry' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 