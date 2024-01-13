<template>
    <el-row>
        <el-col :span="12" style="padding-right: 10px;">
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
        <el-col :span="12" style="padding-left: 10px;">
            <el-row>
                <el-col>
                    <el-table :data="heroList" stripe style="width: 100%;" height="380">
                        <el-table-column prop="name" label="英雄" />
                    </el-table>
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
const heroList = ref()

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
        //读取文件
        fs.readFile(path.resolve(geerFilePath.value), { encoding: 'utf8' }, (err: any, data: string) => {
            if (err) {
                console.error('读取文件时发生错误:', err)
                return
            }

            // 将 JSON 字符串解析为 JavaScript 对象
            const jsonData = JSON.parse(data)

            //过滤没穿装备的角色
            const filteredHeroes = jsonData.heroes.filter((hero: { equipment: {} }) => Object.keys(hero.equipment).length > 0)

            // 读取本地JSON文件
            const jsonFilePath = path.join(process.cwd(), 'name_mapping_result.json')
            const jsonFile = fs.readFileSync(jsonFilePath, 'utf-8')
            const nameMapping = JSON.parse(jsonFile)

            // 汉化数组中的名字
            const translatedArray = filteredHeroes.map((item: { name: any }) => {
                const englishName = item.name
                const chineseName = nameMapping[englishName] || englishName // 如果找不到对应的中文名字，则使用原始英文名字

                // 保留其他字段，仅替换name字段
                return {
                    ...item,
                    name: chineseName
                }
            })
            heroList.value = translatedArray
            console.log(translatedArray) // 打印汉化后的数组
        })
    }
}

const autoEquipStart = () => {
    //清除按钮点击状态
    const activeElement = document.activeElement as HTMLElement
    if (activeElement) {
        activeElement.blur()
    }
    //判断连接状态
    // if (adbStore.status === 0) {
    //     ElMessage({
    //         message: '尚未连接',
    //         type: 'error',
    //     })
    //     return
    // }
    //判断文件状态
    if (!geerFilePath.value) {
        ElMessage({
            message: '尚未选择文件',
            type: 'error',
        })
        return
    }
}

onMounted(() => {

})
</script>
  
<style>
.upload-geer {
    min-height: 217px;
}
</style>
       