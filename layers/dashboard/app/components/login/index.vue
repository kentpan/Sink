<script setup lang="ts">
import { AlertCircle, Github } from 'lucide-vue-next'
import { onMounted, onUnmounted, ref } from 'vue'
import { toast } from 'vue-sonner'
import { z } from 'zod'

const { t } = useI18n()
const { previewMode } = useRuntimeConfig().public
const { setToken, removeToken } = useAuthToken()

const password = ref('')
const error = ref('')
const isLoading = ref(false)

const LoginSchema = z.object({
  password: z.string().min(1),
})

async function handlePasswordSubmit() {
  error.value = ''
  const result = LoginSchema.safeParse({ password: password.value })

  if (!result.success) {
    error.value = t('login.token_required')
    return
  }

  try {
    const response = await $fetch('/api/login', {
      method: 'POST',
      body: { password: password.value },
    })
    setToken(response.token)
    navigateTo('/dashboard')
  }
  catch (e) {
    removeToken()
    console.error(e)
    toast.error(t('login.failed'), {
      description: e instanceof Error ? e.message : String(e),
    })
  }
}

function handleGitHubLogin() {
  isLoading.value = true

  const width = 600
  const height = 600
  const left = (window.innerWidth - width) / 2
  const top = (window.innerHeight - height) / 2

  const popup = window.open(
    '/api/auth/github',
    'github-oauth',
    `width=${width},height=${height},left=${left},top=${top},resizable=yes`,
  )

  if (!popup) {
    toast.error('Please allow popups for this site')
    isLoading.value = false
    return
  }

  const handleMessage = (event: MessageEvent) => {
    if (event.data?.type === 'GITHUB_LOGIN_SUCCESS') {
      setToken(event.data.token)
      popup.close()
      window.removeEventListener('message', handleMessage)
      navigateTo('/dashboard')
    }
  }

  window.addEventListener('message', handleMessage)

  popup.onclose = () => {
    window.removeEventListener('message', handleMessage)
    isLoading.value = false
  }
}

onMounted(() => {
  isLoading.value = false
})

onUnmounted(() => {
  isLoading.value = false
})
</script>

<template>
  <Card class="w-full max-w-sm">
    <CardHeader>
      <CardTitle class="text-2xl">
        {{ $t('login.title') }}
      </CardTitle>
      <CardDescription>
        {{ $t('login.description') }}
      </CardDescription>
    </CardHeader>
    <CardContent class="grid gap-4">
      <form class="space-y-6" @submit.prevent="handlePasswordSubmit">
        <Input
          type="text"
          name="username"
          autocomplete="username"
          value="root"
          readonly
          class="sr-only"
          tabindex="-1"
          aria-hidden="true"
        />
        <FieldGroup>
          <Field :data-invalid="!!error">
            <FieldLabel for="password">
              {{ $t('login.password_label') || 'Password' }}
            </FieldLabel>
            <Input
              id="password"
              v-model="password"
              type="password"
              name="password"
              autocomplete="current-password"
              placeholder="********"
              :aria-invalid="!!error"
            />
            <FieldError v-if="error" :errors="[error]" />
          </Field>
        </FieldGroup>

        <Alert v-if="previewMode">
          <AlertCircle class="h-4 w-4" />
          <AlertTitle>{{ $t('login.tips') }}</AlertTitle>
          <AlertDescription>
            {{ $t('login.preview_token') }}
            <code class="font-mono text-green-500">SinkCool</code>
          </AlertDescription>
        </Alert>

        <Button class="w-full" type="submit">
          {{ $t('login.submit') }}
        </Button>

        <div class="relative">
          <div class="absolute inset-0 flex items-center">
            <div class="w-full border-t border-muted" />
          </div>
          <div class="relative flex justify-center text-sm">
            <span class="bg-background px-2 text-muted-foreground">or</span>
          </div>
        </div>

        <Button
          class="w-full"
          variant="outline"
          type="button"
          :disabled="isLoading"
          @click="handleGitHubLogin"
        >
          <Github class="mr-2 h-4 w-4" />
          {{ isLoading ? 'Loading...' : 'Login with GitHub' }}
        </Button>
      </form>
    </CardContent>
  </Card>
</template>
