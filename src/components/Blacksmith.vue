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
import sharp from 'sharp'

const src = ref('screenshot.png?v=' + Math.random().toString(36).substring(7))
const adbStore = useAdbStore()
const selectedDeviceId = adbStore.device
const data = ref()

const takeScreenshot = () => {
    const adbPath = path.join(process.cwd(), 'platform-tools', 'adb.exe')
    const adbCommand = adbPath + ' -s ' + selectedDeviceId + ' shell screencap -p /sdcard/screenshot.png && ' + adbPath + ' -s ' + selectedDeviceId + ' pull /sdcard/screenshot.png'
    exec(adbCommand, async (error, stdout, stderr) => {
        if (error) {
            console.error('截图错误:', error)
            return
        }
        if (stderr) {
            console.error('截图错误:', error)
            return
        }
        console.log(stdout)
        await primaryAttribute()
        src.value = 'screenshot.png?v=' + Math.random().toString(36).substring(7)
    })
    const activeElement = document.activeElement as HTMLElement
    if (activeElement) {
        activeElement.blur()
    }
}
const worker = await createWorker('eng+chi_sim', 1, {
    langPath: path.join(__dirname, 'lang-data'),
    logger: m => console.log(m)
})
const textOcr = async (imagePath: string) => {
    const { data: { text } } = await worker.recognize(imagePath)
    const valuesArray = text.split(' ')
    console.log(valuesArray)
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

const primaryAttribute = async () => {
    const processedImagePath = 'processed_screenshot.png'
    const cropOptions = { left: 80, top: 270, width: 300, height: 40 }
    await sharp('screenshot.png')
        .resize(1600, 900)
        .extract(cropOptions)
        .toFile(processedImagePath)
    textOcr('processed_screenshot.png')
    return processedImagePath
}

</script>

<style lang="scss"></style>
  