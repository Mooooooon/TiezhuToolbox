import { defineStore } from 'pinia'

export const useMenuStore = defineStore('menu', {
    state: () => ({
        menuIndex: '1'
    })
})