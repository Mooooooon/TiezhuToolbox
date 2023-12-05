import { defineStore } from 'pinia'

interface NameItem {
  value: string
  name: string
}

export const useAdbStore = defineStore('adb', {
  state: () => ({
    status: 0,
    port: '',
    device: '',
    deviceList: [] as NameItem[]
  })
})