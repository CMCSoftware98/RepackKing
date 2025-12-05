import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'
import { createVuetify, type ThemeDefinition } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

const torrentDarkTheme: ThemeDefinition = {
  dark: true,
  colors: {
    background: '#0a1a14',
    surface: '#0d2a1f',
    'surface-variant': '#133d2c',
    'surface-bright': '#1a5c42',
    primary: '#00ff87',
    'primary-darken-1': '#00b36b',
    secondary: '#60efff',
    'secondary-darken-1': '#00bcd4',
    accent: '#00d4aa',
    error: '#ff5252',
    info: '#60efff',
    success: '#00ff87',
    warning: '#ffc107',
    'on-background': '#ffffff',
    'on-surface': '#a8d5c2',
    'on-primary': '#0a1a14',
    'on-secondary': '#0a1a14',
  },
  variables: {
    'border-color': '#1e7654',
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
    'theme-kbd': '#0d2a1f',
    'theme-on-kbd': '#ffffff',
    'theme-code': '#133d2c',
    'theme-on-code': '#00ff87',
  }
}

export default createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'torrentDark',
    themes: {
      torrentDark: torrentDarkTheme,
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
