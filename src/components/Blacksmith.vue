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
import { exec } from 'child_process'
import path from 'path'

const takeScreenshot = () => {
    const adbPath = path.join(process.cwd(), 'platform-tools', 'adb.exe')
    const adbCommand = ' shell screencap -p /sdcard/screenshot.png && adb pull /sdcard/screenshot.png'
    exec(adbPath + ' devices', (error, stdout, stderr) => {
        if (error) {
            console.error('获取设备列表失败:', error)
            return
        }
        console.log('连接的设备:', stdout)
    })
    exec(adbPath + adbCommand, (error, stdout, stderr) => {
        if (error) {
            console.error('截图错误:', error)
            return
        }
        console.log(stdout)
    })
}
const src =
    'https://cube.elemecdn.com/6/94/4d3ea53c084bad6931a56d5158a48jpeg.jpeg'
</script>

<style lang="scss"></style>
  