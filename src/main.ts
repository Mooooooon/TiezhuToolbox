import { createApp } from 'vue'
import "./style.css"
import 'element-plus/theme-chalk/src/message.scss'
import App from './App.vue'
import { createPinia } from 'pinia'

const app = createApp(App)

const pinia = createPinia()
app.use(pinia)

app.mount('#app')