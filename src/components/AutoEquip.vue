<template>
    <el-row>
        <el-col :span="12">
            <el-row>
                <el-col>
                    <el-upload class="upload-geer" drag ref="upload" :auto-upload="false" :on-exceed="handleExceed"
                        :on-change="handleChange" :limit="1">
                        <el-icon class="el-icon--upload"><upload-filled /></el-icon>
                        <div class="el-upload__text">
                            将文件拖放至此处或 <em>点击上传</em>
                        </div>
                    </el-upload>
                </el-col>
            </el-row>
            <el-row>
                <el-col>
                    <el-button @click="autoEquipStart">开始换装</el-button>
                </el-col>
            </el-row>
        </el-col>
    </el-row>
</template>
  
<script lang="ts" setup>
import type { UploadInstance, UploadProps, UploadRawFile } from 'element-plus'
import { onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { UploadFilled } from '@element-plus/icons-vue'
import { genFileId } from 'element-plus'
import { exec } from 'child_process'
import { useAdbStore } from '../store/adb'
import path from 'path'
import fs from 'fs'
const axios = require('axios')

const upload = ref<UploadInstance>()
const adbStore = useAdbStore()
const geerFilePath = ref<string>()

//选中文件后清空之前选择的文件
const handleExceed: UploadProps['onExceed'] = (files) => {
    upload.value!.clearFiles()
    const file = files[0] as UploadRawFile
    file.uid = genFileId()
    upload.value!.handleStart(file)
}

const handleChange: UploadProps['onChange'] = (uploadFile) => {
    if (uploadFile.raw) {
        geerFilePath.value = uploadFile.raw.path
    }
}

const autoEquipStart = () => {
    //清除按钮点击状态
    const activeElement = document.activeElement as HTMLElement
    if (activeElement) {
        activeElement.blur()
    }
    //判断连接状态
    if (adbStore.status === 0) {
        ElMessage({
            message: '尚未连接',
            type: 'error',
        })
        return
    }
    //判断文件状态
    if (!geerFilePath.value) {
        ElMessage({
            message: '尚未选择文件',
            type: 'error',
        })
        return
    }
    //读取文件
    fs.readFile(path.resolve(geerFilePath.value), { encoding: 'utf8' }, (err: any, data: string) => {
        if (err) {
            console.error('读取文件时发生错误:', err)
            return
        }

        // 将 JSON 字符串解析为 JavaScript 对象
        const jsonData = JSON.parse(data)

        // 现在你可以在代码中使用 jsonData 了
        console.log('解析后的 JSON 数据:', jsonData)

        //过滤没穿装备的角色
        const filteredHeroes = jsonData.heroes.filter((hero: { equipment: {} }) => Object.keys(hero.equipment).length > 0)
        console.log(filteredHeroes)

    })
}

onMounted(() => {

})
</script>
  
<style>
.upload-geer {
    min-height: 217px;
}
</style>
       