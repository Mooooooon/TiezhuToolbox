<template>
    <el-row>
        <el-col :span="12">
            <el-button @click="takeScreenshot">截图</el-button>
        </el-col>
        <el-col :span="12">
            <div class="block">
                <el-image :src="src">
                    <template #placeholder>
                        <div class="image-slot">Loading<span class="dot">...</span></div>
                    </template>
                </el-image>
            </div>
        </el-col>
    </el-row>
</template>

<script lang="ts" setup>
import { onUnmounted, ref } from 'vue'
import { exec } from 'child_process'
import { useAdbStore } from '../store/adb'
import { createWorker } from 'tesseract.js'
import path from 'path'

const src = ref('screenshot.png?v=' + Math.random().toString(36).substring(7))
const adbStore = useAdbStore()
const selectedDeviceId = adbStore.device
const data = ref()

const takeScreenshot = () => {
    const adbPath = path.join(process.cwd(), 'platform-tools', 'adb.exe')
    const adbCommand = adbPath + ' -s ' + selectedDeviceId + ' shell screencap -p /sdcard/screenshot.png && ' + adbPath + ' -s ' + selectedDeviceId + ' pull /sdcard/screenshot.png'
    exec(adbCommand, (error, stdout, stderr) => {
        if (error) {
            console.error('截图错误:', error)
            return
        }
        if (stderr) {
            console.error('截图错误:', error)
            return
        }
        console.log(stdout)
        src.value = 'screenshot.png?v=' + Math.random().toString(36).substring(7)
        textOcr()
    })
    const activeElement = document.activeElement as HTMLElement
    if (activeElement) {
        activeElement.blur()
    }
}

const worker = await createWorker('eng')
const textOcr = () => {
    (async () => {
        data.value = await worker.recognize('screenshot.png')
        console.log(data)
    })()
}

// 定义一个销毁 worker 的函数
const destroyWorker = async () => {
    if (worker) {
        await worker.terminate()
    }
}

// 使用 onUnmounted 钩子来确保在组件销毁时销毁 worker
onUnmounted(() => {
    destroyWorker()
})
</script>

<style lang="scss"></style>
  