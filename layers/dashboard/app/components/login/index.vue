<script setup lang="ts">
import { AlertCircle } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { z } from 'zod'

const { t } = useI18n()
const { previewMode } = useRuntimeConfig().public
const { setToken, removeToken } = useAuthToken()

const password = ref('')
const error = ref('')

const LoginSchema = z.object({
  password: z.string().min(1),
})

async function handleSubmit() {
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
      <form class="space-y-6" @submit.prevent="handleSubmit">
        <!-- Hidden username field for password managers -->
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
      </form>
    </CardContent>
  </Card>
</template>
