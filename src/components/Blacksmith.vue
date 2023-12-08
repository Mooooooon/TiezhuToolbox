<template>
    <el-row>
        <el-col :span="12">
            <el-button @click="takeScreenshot">截图</el-button>
            <el-descriptions class="gear-info" title="装备信息" :column="1">
                <el-descriptions-item label="强化等级">+{{ enhancementLevel }}</el-descriptions-item>
                <el-descriptions-item label="主属性">{{ primaryAttribute[0] }} {{ primaryAttribute[1] }}</el-descriptions-item>
            </el-descriptions>
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
const enhancementLevel = ref()
const primaryAttribute = ref(["", ""])

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
        await getPrimaryAttribute()
        await getEnhancementLevel()
        // src.value = 'screenshot.png?v=' + Math.random().toString(36).substring(7)
        src.value = 'enhancement_level.png?v=' + Math.random().toString(36).substring(7)
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
    return text
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

const getEnhancementLevel = async () => {
    const processedImagePath = 'enhancement_level.png'
    const cropOptions = { left: 130, top: 105, width: 30, height: 25 }
    await sharp('screenshot.png')
        .resize(1600, 900)
        .extract(cropOptions)
        .toFile(processedImagePath)
    const text = await textOcr(processedImagePath)
    const numbers = text.match(/\d+/g)
    if (numbers) {
        var numericValue = parseInt(numbers.join(''))
        enhancementLevel.value = numericValue
    } else {
        enhancementLevel.value = 0
    }
}

const getPrimaryAttribute = async () => {
    const processedImagePath = 'primary_attribute.png'
    const cropOptions = { left: 80, top: 270, width: 300, height: 40 }
    await sharp('screenshot.png')
        .resize(1600, 900)
        .extract(cropOptions)
        .toFile(processedImagePath)
    const text = await textOcr(processedImagePath)
    const stringWithoutSpaces = text.replace(/\s+/g, '')
    primaryAttribute.value = stringWithoutSpaces.split(/(\d+%?)/).filter(Boolean)
}
</script>

<style lang="scss">
.gear-info {
    margin-top: 20px;
    padding-right: 20px;
}
</style>
  