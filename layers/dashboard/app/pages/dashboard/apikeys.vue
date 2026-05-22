<script setup lang="ts">
import { Check, Copy, Eye, EyeOff, Key, Plus, Trash2 } from 'lucide-vue-next'
import { computed, ref } from 'vue'
import { toast } from 'vue-sonner'
import { useFetch } from '#imports'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useAuthToken } from '@/composables/useAuthToken'

definePageMeta({
  layout: 'dashboard',
})

interface ApiKey {
  id: string
  key: string
  name: string
  createdAt: number
  lastUsedAt?: number
  expiresAt?: number
  active: boolean
}

const { getToken } = useAuthToken()

const { data: apiKeys, refresh } = useFetch<{ keys: ApiKey[] }>('/api/api-keys', {
  headers: {
    Authorization: `Bearer ${getToken()}`,
  },
})

const showCreateDialog = ref(false)
const showDeleteDialog = ref(false)
const deleteKeyId = ref<string | null>(null)
const newKeyName = ref('')
const copiedKey = ref<string | null>(null)
const visibleKeys = ref<Set<string>>(new Set())

const sortedKeys = computed(() => {
  if (!apiKeys.value)
    return []
  return [...apiKeys.value.keys].sort((a, b) => b.createdAt - a.createdAt)
})

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString()
}

function formatExpiration(expiresAt?: number): string {
  if (!expiresAt)
    return 'Never'
  if (Date.now() > expiresAt)
    return 'Expired'
  return formatDate(expiresAt)
}

function isExpired(expiresAt?: number): boolean {
  return !!expiresAt && Date.now() > expiresAt
}

async function createApiKey() {
  if (!newKeyName.value.trim()) {
    toast.error('Please enter a name')
    return
  }

  try {
    const response = await fetch('/api/api-keys', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`,
      },
      body: JSON.stringify({ name: newKeyName.value.trim() }),
    })

    if (response.ok) {
      toast.success('API Key created successfully')
      newKeyName.value = ''
      showCreateDialog.value = false
      await refresh()
    }
    else {
      toast.error('Failed to create API Key')
    }
  }
  catch {
    toast.error('Failed to create API Key')
  }
}

async function deleteApiKey() {
  if (!deleteKeyId.value)
    return

  try {
    const response = await fetch(`/api/api-keys/${deleteKeyId.value}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    })

    if (response.ok) {
      toast.success('API Key deleted successfully')
      deleteKeyId.value = null
      showDeleteDialog.value = false
      await refresh()
    }
    else {
      toast.error('Failed to delete API Key')
    }
  }
  catch {
    toast.error('Failed to delete API Key')
  }
}

function copyKey(key: string) {
  navigator.clipboard.writeText(key)
  copiedKey.value = key
  setTimeout(() => {
    copiedKey.value = null
  }, 2000)
}

function toggleKeyVisibility(id: string) {
  if (visibleKeys.value.has(id)) {
    visibleKeys.value.delete(id)
  }
  else {
    visibleKeys.value.add(id)
  }
}
</script>

<template>
  <main class="space-y-6">
    <Teleport to="#dashboard-header-actions" defer>
      <Dialog v-model:open="showCreateDialog">
        <DialogTrigger as-child>
          <Button>
            <Plus class="mr-2 h-4 w-4" />
            Create API Key
          </Button>
        </DialogTrigger>
        <DialogContent class="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create API Key</DialogTitle>
            <DialogDescription>
              Create a new API key for accessing the API programmatically.
            </DialogDescription>
          </DialogHeader>
          <div class="space-y-4 py-4">
            <div class="space-y-2">
              <Label for="name">Name</Label>
              <Input
                id="name"
                v-model="newKeyName"
                placeholder="Enter API key name"
                @keyup.enter="createApiKey"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" @click="showCreateDialog = false">
              Cancel
            </Button>
            <Button @click="createApiKey">
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Teleport>

    <Card>
      <CardHeader>
        <CardTitle>API Keys</CardTitle>
        <CardDescription>
          Manage your API keys for programmatic access to the API.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table v-if="sortedKeys.length > 0">
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Key</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Last Used</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="key in sortedKeys" :key="key.id">
              <TableCell class="font-medium">
                {{ key.name }}
              </TableCell>
              <TableCell class="max-w-xs">
                <div class="flex items-center gap-2">
                  <span class="truncate font-mono text-sm">
                    {{ visibleKeys.has(key.id) ? key.key : `${key.key.slice(0, 8)}...${key.key.slice(-8)}` }}
                  </span>
                  <button
                    class="
                      rounded p-1
                      hover:bg-muted
                    "
                    @click="toggleKeyVisibility(key.id)"
                  >
                    <Eye v-if="!visibleKeys.has(key.id)" class="h-4 w-4" />
                    <EyeOff v-else class="h-4 w-4" />
                  </button>
                </div>
              </TableCell>
              <TableCell>{{ formatDate(key.createdAt) }}</TableCell>
              <TableCell>
                {{ key.lastUsedAt ? formatDate(key.lastUsedAt) : 'Never' }}
              </TableCell>
              <TableCell>
                <Badge :class="isExpired(key.expiresAt) ? 'bg-destructive' : ''">
                  {{ formatExpiration(key.expiresAt) }}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge
                  :class="key.active ? 'bg-green-500/20 text-green-600' : `
                    bg-muted
                  `"
                >
                  {{ key.active ? 'Active' : 'Inactive' }}
                </Badge>
              </TableCell>
              <TableCell>
                <div class="flex items-center gap-2">
                  <Tooltip>
                    <TooltipTrigger as-child>
                      <Button variant="ghost" size="icon" @click="copyKey(key.key)">
                        <Check v-if="copiedKey === key.key" class="h-4 w-4" />
                        <Copy v-else class="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Copy</p>
                    </TooltipContent>
                  </Tooltip>
                  <Dialog v-model:open="showDeleteDialog">
                    <DialogTrigger as-child>
                      <Button
                        variant="ghost" size="icon" class="text-destructive"
                      >
                        <Trash2 class="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Delete API Key</DialogTitle>
                        <DialogDescription>
                          Are you sure you want to delete this API key? This action cannot be undone.
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <Button variant="outline" @click="showDeleteDialog = false">
                          Cancel
                        </Button>
                        <Button
                          variant="destructive"
                          :disabled="!deleteKeyId"
                          @click="deleteApiKey"
                        >
                          Delete
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
        <div v-else class="py-12 text-center">
          <div
            class="
              mx-auto mb-4 flex h-16 w-16 items-center justify-center
              rounded-full bg-muted
            "
          >
            <Key class="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 class="mb-2 text-lg font-semibold">
            No API Keys
          </h3>
          <p class="text-sm text-muted-foreground">
            Create your first API key to get started.
          </p>
        </div>
      </CardContent>
    </Card>
  </main>
</template>
