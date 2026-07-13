<script setup lang="ts">
import type { AuthFormField, FormError, FormSubmitEvent } from '@nuxt/ui'

// Écran de connexion sans la sidebar du dashboard.
definePageMeta({ layout: false })

const authClient = useAuth()
const session = authClient.useSession()

// Un visiteur déjà connecté n'a rien à faire sur /login → on le renvoie à l'accueil.
watchEffect(() => {
  if (session.value.data) navigateTo('/')
})

const fields: AuthFormField[] = [
  { name: 'email', type: 'email', label: 'Email', placeholder: 'toi@exemple.com', required: true },
  { name: 'password', type: 'password', label: 'Mot de passe', placeholder: '••••••••', required: true }
]

// Validation locale minimale (pas de dépendance de schéma) : champs non vides.
function validate(state: { email?: string, password?: string }): FormError[] {
  const errors: FormError[] = []
  if (!state.email) errors.push({ name: 'email', message: 'Email requis' })
  if (!state.password) errors.push({ name: 'password', message: 'Mot de passe requis' })
  return errors
}

const loading = ref(false)
const errorMsg = ref('')

async function onSubmit(event: FormSubmitEvent<{ email: string, password: string }>) {
  loading.value = true
  errorMsg.value = ''
  const { error } = await authClient.signIn.email({
    email: event.data.email,
    password: event.data.password
  })
  loading.value = false

  if (error) {
    // Message générique pour ne pas révéler si l'email existe (bonne pratique sécurité).
    errorMsg.value = error.code === 'INVALID_EMAIL_OR_PASSWORD'
      ? 'Email ou mot de passe incorrect.'
      : (error.message || 'Échec de la connexion.')
    return
  }

  await navigateTo('/')
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-muted p-4">
    <UCard class="w-full max-w-sm">
      <div class="mb-6 flex items-center gap-2.5">
        <span class="size-6 rounded-md bg-primary shrink-0" />
        <span class="text-lg font-bold tracking-tight">Veille<span class="text-primary">.dev</span></span>
      </div>

      <UAlert
        v-if="errorMsg"
        color="error"
        variant="subtle"
        icon="i-lucide-triangle-alert"
        :title="errorMsg"
        class="mb-4"
      />

      <UAuthForm
        :fields="fields"
        :validate="validate"
        :loading="loading"
        title="Connexion"
        description="Accès réservé à l'administrateur."
        :submit="{ label: 'Se connecter' }"
        @submit="onSubmit"
      />
    </UCard>
  </div>
</template>
