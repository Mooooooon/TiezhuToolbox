import { createApp } from 'vue'
import "./style.css"
import 'element-plus/theme-chalk/src/message.scss'
import App from './App.vue'

createApp(App)
  .mount('#app')
  .$nextTick(() => {
    postMessage({ payload: 'removeLoading' }, '*')
  })
