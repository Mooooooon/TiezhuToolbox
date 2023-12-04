import { defineStore } from 'pinia'

export const useAdbStore = defineStore('adb', {
  state: () => ({
    status: 0
  })
})