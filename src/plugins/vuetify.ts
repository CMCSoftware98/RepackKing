import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'
import { createVuetify, type ThemeDefinition } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

const oceanDarkTheme: ThemeDefinition = {
  dark: true,
  colors: {
    background: '#0a1929',
    surface: '#0d2137',
    'surface-variant': '#132f4c',
    'surface-bright': '#1a3a5c',
    primary: '#0077b6',
    'primary-darken-1': '#005f8a',
    secondary: '#00b4d8',
    'secondary-darken-1': '#0096b4',
    accent: '#48cae4',
    error: '#ff5252',
    info: '#2196F3',
    success: '#4caf50',
    warning: '#ffc107',
    'on-background': '#ffffff',
    'on-surface': '#b0bec5',
    'on-primary': '#ffffff',
    'on-secondary': '#000000',
  },
  variables: {
    'border-color': '#1e4976',
    'border-opacity': 0.12,
    'high-emphasis-opacity': 1,
    'medium-emphasis-opacity': 0.7,
    'disabled-opacity': 0.38,
    'idle-opacity': 0.04,
    'hover-opacity': 0.08,
    'focus-opacity': 0.12,
    'selected-opacity': 0.08,
    'activated-opacity': 0.12,
    'pressed-opacity': 0.12,
    'dragged-opacity': 0.08,
    'theme-kbd': '#0d2137',
    'theme-on-kbd': '#ffffff',
    'theme-code': '#132f4c',
    'theme-on-code': '#48cae4',
  }
}

export default createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'oceanDark',
    themes: {
      oceanDark: oceanDarkTheme,
    },
  },
  defaults: {
    VBtn: {
      variant: 'flat',
      rounded: 'lg',
    },
    VCard: {
      rounded: 'xl',
      elevation: 0,
    },
    VTextField: {
      variant: 'outlined',
      density: 'comfortable',
      rounded: 'lg',
    },
    VChip: {
      rounded: 'lg',
    },
  },
})
