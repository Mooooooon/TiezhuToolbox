import { defineStore } from 'pinia'

export const useAdbStore = defineStore('adb', {
  state: () => ({
    status: '尚未连接'
  }),
  actions: {
    connect() {
      this.status = '模拟器连接成功'
    }
  }
})