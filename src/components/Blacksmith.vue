<template>
    <el-row>
        <el-col :span="12">
            <el-button @click="takeScreenshot">截图</el-button>
            <el-descriptions class="gear-info" title="装备信息" :column="1">
                <el-descriptions-item label="强化等级">
                    {{ enhancementLevel !== undefined ? '+' + enhancementLevel : '' }}
                </el-descriptions-item>
                <el-descriptions-item label="主属性">
                    {{ primaryAttribute[0] }} {{ primaryAttribute[1] }}
                </el-descriptions-item>
                <el-descriptions-item :label="attribute[0][0]">{{ attribute[0][1] }}</el-descriptions-item>
                <el-descriptions-item :label="attribute[1][0]">{{ attribute[1][1] }}</el-descriptions-item>
                <el-descriptions-item :label="attribute[2][0]">{{ attribute[2][1] }}</el-descriptions-item>
                <el-descriptions-item :label="attribute[3][0]">{{ attribute[3][1] }}</el-descriptions-item>
                <el-descriptions-item label="分数">{{ score }}</el-descriptions-item>
                <el-descriptions-item label="预期分数">{{ expectantScore }}</el-descriptions-item>
            </el-descriptions>
        </el-col>
        <el-col :span="12">
            <el-row>
                <el-col>
                    <el-image :src="src">
                        <template #placeholder>
                            <div class="image-slot">Loading<span class="dot">...</span></div>
                        </template>
                    </el-image>
                </el-col>
            </el-row>
            <el-row>
                <el-col :span="6">
                    <el-text class="mx-1" size="large">强化建议：</el-text>
                </el-col>
                <el-col :span="18">
                    <el-text class="mx-1" size="large">{{ enhancedRecommendation }}</el-text>
                </el-col>
            </el-row>
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
const part = ref('')
const primaryAttribute = ref(["", ""])
const attribute = ref<[string, string][]>([["", ""], ["", ""], ["", ""], ["", ""]])
const score = ref(0)
const enhancedRecommendation = ref('')
const expectantScore = ref(0)
const activeElement = document.activeElement as HTMLElement

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
        // await getEnhancementLevel()
        // await getPart()
        // await getAttribute()
        // score.value = calculateScore(attribute.value)
        // enhancedRecommendation.value = calculateAnalysis()
        // expectantScore.value = parseFloat((expectant() + score.value).toFixed(2))
        src.value = 'screenshot.png?v=' + Math.random().toString(36).substring(7)
    })
    if (activeElement) {
        activeElement.blur()
    }
}
// const worker = await createWorker('eng+chi_sim', 1, {
//     langPath: path.join(process.cwd(), 'lang-data'),
//     logger: m => console.log(m)
// })
const textOcr = async (imagePath: string) => {
    // const { data: { text } } = await worker.recognize(imagePath)
    // return text
    const ocrPath = path.join(process.cwd(), 'PaddleOCR-json', 'PaddleOCR-json.exe')
    const newImagePath = path.join(process.cwd(), imagePath)
    const configPath = path.join(process.cwd(), 'PaddleOCR-json', 'models', 'config_chinese.txt')
    const detPath = path.join(process.cwd(), 'PaddleOCR-json', 'models', 'ch_PP-OCRv3_det_infer')
    const recPath = path.join(process.cwd(), 'PaddleOCR-json', 'models', 'ch_PP-OCRv3_rec_infer')
    const dictPath = path.join(process.cwd(), 'PaddleOCR-json', 'models', 'dict_chinese.txt')
    const ocrCommand = ocrPath
        + ' -image_path=' + newImagePath
        + ' -config_path=' + configPath
        + ' -det_model_dir=' + detPath
        + ' -rec_model_dir=' + recPath
        + ' -rec_char_dict_path=' + dictPath
    console.log(ocrCommand)
    exec(ocrCommand, async (error, stdout, stderr) => {
        if (error) {
            // console.error('错误:', error)
        }
        if (stderr) {
            // console.error('错误:', error)
        }
        // 使用正则表达式匹配JSON格式的字符串
        const jsonRegex = /{.*}/s
        const match = stdout.match(jsonRegex)

        if (match) {
            // 找到了JSON字符串，解析并打印
            const jsonData = JSON.parse(match[0])
            console.log(jsonData.data)
            return jsonData.data
        } else {
            console.log('未找到有效的JSON数据')
        }
    })
}

// 定义一个销毁 worker 的函数
const destroyWorker = async () => {
    // if (worker) {
    //     await worker.terminate()
    // }
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

const getPart = async () => {
    const processedImagePath = 'part.png'
    const cropOptions = { left: 216, top: 123, width: 45, height: 26 }
    await sharp('screenshot.png')
        .resize(1600, 900)
        .extract(cropOptions)
        .toFile(processedImagePath)
    const text = await textOcr(processedImagePath)
    part.value = text.replace(/\s/g, "")
}

const getPrimaryAttribute = async () => {
    const processedImagePath = 'primary_attribute.png'
    const cropOptions = { left: 80, top: 270, width: 300, height: 40 }
    await sharp('screenshot.png')
        .resize(1600, 900)
        .extract(cropOptions)
        .toFile(processedImagePath)
    const text = await textOcr(processedImagePath)
    const stringWithoutSpacesAndCommas = text.replace(/[\s,]+/g, '')
    primaryAttribute.value = stringWithoutSpacesAndCommas.split(/(\d+%?)/).filter(Boolean)
}

const getAttribute = async () => {
    const processedImagePath = 'attribute.png'
    const cropOptions = { left: 45, top: 340, width: 410, height: 130 }
    await sharp('screenshot.png')
        .resize(1600, 900)
        .extract(cropOptions)
        .toFile(processedImagePath)
    const text = await textOcr(processedImagePath)
    const elements = text.split('\n').filter(function (element) {
        return element.trim() !== ''
    })
    const processedElements = elements.map(function (element): [string, string] {
        const stringWithoutSpaces = element.replace(/\s+/g, '')
        const parts = stringWithoutSpaces.split(/(\d+%?)/).filter(Boolean)
        return [parts[0], parts[1]]
    })

    attribute.value = processedElements
}

const calculateScore = (attribute: [string, string][]): number => {
    let score = 0
    for (let [name, value] of attribute) {
        switch (name) {
            case "攻击力":
                if (value.includes("%")) {
                    score += parseFloat(value.replace('%', '')) * 1
                } else {
                    score += parseFloat(value) * 3.46 / 39
                }
                break
            case "防御力":
                if (value.includes("%")) {
                    score += parseFloat(value.replace('%', '')) * 1
                } else {
                    score += parseFloat(value) * 4.99 / 31
                }
                break
            case "生命值":
                if (value.includes("%")) {
                    score += parseFloat(value.replace('%', '')) * 1
                } else {
                    score += parseFloat(value) * 3.09 / 174
                }
                break
            case "效果命中":
            case "效果抗性":
                score += parseFloat(value.replace('%', '')) * 1
                break
            case "速度":
                score += parseFloat(value) * 2
                break
            case "暴击伤害":
                score += parseFloat(value.replace('%', '')) * 1.125
                break
            case "暴击率":
                score += parseFloat(value.replace('%', '')) * 1.5
                break
        }
    }
    const roundedScore = parseFloat(score.toFixed(2))
    return roundedScore
}

const calculateAnalysis = () => {
    if (["武器", "铠甲", "头盔"].includes(part.value)) {
        if (enhancementLevel.value < 3 && score.value >= 22) return "继续强化"
        else if (enhancementLevel.value < 6 && score.value >= 28) return "继续强化"
        else if (enhancementLevel.value < 9 && score.value >= 34) return "继续强化"
        else if (enhancementLevel.value < 12 && score.value >= 40) return "继续强化"
        else if (enhancementLevel.value < 15 && score.value >= 46) return "继续强化"
        else if (enhancementLevel.value == 15 && score.value >= 52) return "建议重铸"
        else return "分数过低，建议放弃"
    } else {
        if (["攻击力", "防御力", "生命值"].includes(primaryAttribute.value[0]) && !primaryAttribute.value[1].includes('%')) {
            return "固定值主属性，建议放弃"
        }
        else {
            if (enhancementLevel.value < 3 && score.value >= 20) return "继续强化"
            else if (enhancementLevel.value < 6 && score.value >= 26) return "继续强化"
            else if (enhancementLevel.value < 9 && score.value >= 32) return "继续强化"
            else if (enhancementLevel.value < 12 && score.value >= 38) return "继续强化"
            else if (enhancementLevel.value < 15 && score.value >= 44) return "继续强化"
            else if (enhancementLevel.value == 15 && score.value >= 50) return "建议重铸"
            else return "分数过低，建议放弃"
        }
    }
}

const expectant = (): number => {
    let expectant = 0
    for (let [name, value] of attribute.value) {
        switch (name) {
            case "攻击力":
                if (value.includes("%")) {
                    expectant += (4 + 8) / 2
                } else {
                    expectant += (33 + 46) / 2 / 39
                }
                break
            case "防御力":
                if (value.includes("%")) {
                    expectant += (4 + 8) / 2
                } else {
                    expectant += (28 + 35) / 2 / 31
                }
                break
            case "生命值":
                if (value.includes("%")) {
                    expectant += (4 + 8) / 2
                } else {
                    expectant += (157 + 202) / 2 / 174
                }
                break
            case "效果命中":
            case "效果抗性":
                expectant += (4 + 8) / 2
                break
            case "速度":
                expectant += (2 + 4) / 2 * 2
                break
            case "暴击伤害":
                if (value.includes("%")) {
                    expectant += (4 + 7) / 2 * 1.125
                }
                break
            case "暴击率":
                if (value.includes("%")) {
                    expectant += (3 + 5) / 2 * 1.5
                }
                break
        }
    }
    return expectant / 4 * Math.floor((17 - enhancementLevel.value) / 3)
}
</script>

<style lang="scss">
.gear-info {
    margin-top: 20px;
    padding-right: 20px;
}

.gear-info .el-descriptions__label {
    width: 100px;
    display: inline-block;
}
</style>
  