<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const username = ref('')
const password = ref('')
const showPassword = ref(false)

async function handleLogin() {
  const success = await authStore.login(username.value, password.value)
  if (success) {
    router.push('/admin')
  }
}
</script>

<template>
  <div class="admin-login">
    <v-container class="fill-height">
      <v-row justify="center" align="center">
        <v-col cols="12" sm="8" md="6" lg="4">
          <v-card class="admin-login__card pa-6" elevation="0">
            <div class="text-center mb-6">
              <v-icon size="64" color="primary" class="mb-4">mdi-shield-account</v-icon>
              <h1 class="admin-login__title">Admin Login</h1>
              <p class="text-medium-emphasis">Sign in to access the admin panel</p>
            </div>

            <v-form @submit.prevent="handleLogin">
              <v-text-field
                v-model="username"
                label="Username"
                prepend-inner-icon="mdi-account"
                variant="outlined"
                class="mb-4"
                :error-messages="authStore.error && !password ? authStore.error : undefined"
                autocomplete="username"
              />

              <v-text-field
                v-model="password"
                label="Password"
                prepend-inner-icon="mdi-lock"
                :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
                :type="showPassword ? 'text' : 'password'"
                variant="outlined"
                class="mb-4"
                :error-messages="authStore.error && password ? authStore.error : undefined"
                autocomplete="current-password"
                @click:append-inner="showPassword = !showPassword"
              />

              <v-alert
                v-if="authStore.error"
                type="error"
                variant="tonal"
                class="mb-4"
                density="compact"
              >
                {{ authStore.error }}
              </v-alert>

              <v-btn
                type="submit"
                color="primary"
                size="large"
                block
                :loading="authStore.loading"
                :disabled="!username || !password"
              >
                Sign In
              </v-btn>
            </v-form>

            <div class="text-center mt-6">
              <router-link to="/" class="text-primary text-decoration-none">
                <v-icon size="small" class="mr-1">mdi-arrow-left</v-icon>
                Back to Home
              </router-link>
            </div>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>

<style scoped lang="scss">
.admin-login {
  min-height: 100vh;
  display: flex;
  align-items: center;
  background: linear-gradient(135deg, #0a1929 0%, #0d2137 100%);

  &__card {
    background: rgba(13, 33, 55, 0.8) !important;
    backdrop-filter: blur(12px);
    border: 1px solid rgba(72, 202, 228, 0.1);
    border-radius: 16px;
  }

  &__title {
    font-family: 'Montserrat', sans-serif;
    font-size: 1.75rem;
    font-weight: 700;
    background: linear-gradient(135deg, #ffffff 0%, #48cae4 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
}
</style>
