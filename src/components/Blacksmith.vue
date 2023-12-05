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
import { ref } from 'vue'
import { exec } from 'child_process'
import path from 'path'

const src = ref('screenshot.png')

const takeScreenshot = () => {
    const adbPath = path.join(process.cwd(), 'platform-tools', 'adb.exe')
    const adbCommand = adbPath + ' shell screencap -p /sdcard/screenshot.png && ' + adbPath + ' pull /sdcard/screenshot.png'
    exec(adbPath + ' devices', (error, stdout, stderr) => {
        if (error) {
            console.error('获取设备列表失败:', error)
            return
        }
        console.log('连接的设备:', stdout)
        // 分割字符串以获取设备列表
        const devices = stdout.split('\n')
            .filter(line => line.includes('device'))
            .map(line => line.replace('device', '').trim())

        console.log('连接的设备:', devices)
        // devices 现在是一个包含设备 ID 的数组
    })
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
    })
    const activeElement = document.activeElement as HTMLElement
    if (activeElement) {
        activeElement.blur()
    }
}
</script>

<style lang="scss"></style>
  