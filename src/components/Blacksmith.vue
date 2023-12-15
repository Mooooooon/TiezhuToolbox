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
import { exec, spawn } from 'child_process'
import { useAdbStore } from '../store/adb'
import path from 'path'
import sharp from 'sharp'

const src = ref('')
const adbStore = useAdbStore()
const selectedDeviceId = adbStore.device
const enhancementLevel = ref(0)
const part = ref('')
const primaryAttribute = ref<string[]>([])
const attribute = ref<[string, string][]>([["", ""], ["", ""], ["", ""], ["", ""]])
const score = ref(0)
const enhancedRecommendation = ref('')
const expectantScore = ref(0)

const child = spawn(path.join(process.cwd(), 'PaddleOCR-json', 'PaddleOCR-json.exe'), {
    cwd: path.join(process.cwd(), 'PaddleOCR-json'),
    stdio: ['pipe', 'pipe', 'pipe']
})
// 从子进程接收数据
child.stdout.on('data', (data: Buffer) => {
    let strOut: string = data.toString()
    // 检测启动成功
    if (strOut.includes('OCR init completed.')) {
        console.log('初始化完成！')
    } else if (strOut.includes('PaddleOCR-json v1.3.0')) {
        console.log(strOut)
    } else {
        try {
            let jsonOutput = JSON.parse(strOut)
            if (jsonOutput.code === 100) {
                const gearInfo = jsonOutput.data.filter((item: { score: number }) => item.score >= 0.5).map((item: { text: string }) => item.text)
                if (gearInfo.length === 12) {
                    // 在第一项添加 "+0"
                    gearInfo.unshift("+0")
                }
                enhancementLevel.value = parseInt(gearInfo[0].replace("+", "")) // 强化等级 去掉 "+" 并转化为数字
                part.value = gearInfo[1]
                primaryAttribute.value.push(gearInfo[2]) // 第三项
                primaryAttribute.value.push(gearInfo[3]) // 第四项
                const mergedItems = []
                for (let i = 4; i < gearInfo.length; i += 2) {
                    if (i + 1 < gearInfo.length) {
                        const mergedArray = [gearInfo[i], gearInfo[i + 1]]
                        mergedItems.push(mergedArray)
                    }
                }
                attribute.value = mergedItems as [string, string][]
                score.value = calculateScore(attribute.value)
                enhancedRecommendation.value = calculateAnalysis()
                expectantScore.value = parseFloat((expectant() + score.value).toFixed(2))
                console.log(gearInfo)
            } else {
                console.log('Code is not 100, original output:', strOut)
            }
        } catch (e) {
            console.error('Error parsing JSON:', e)
        }
    }
})
// 监听退出事件
child.on('close', () => {
    console.log('子进程退出')
})
// 因为这个工具的作者把info输出在了stderr，所以不要做错误处理
// child.stderr.on('data', (data) => {
//     console.error(`子进程错误输出：${data}`)
// })

//截图
const takeScreenshot = () => {
    const adbPath = path.join(process.cwd(), 'platform-tools', 'adb.exe')
    const adbCommand = adbPath + ' -s ' + selectedDeviceId + ' shell screencap -p /sdcard/screenshot.png && ' + adbPath + ' -s ' + selectedDeviceId + ' pull /sdcard/screenshot.png'

    exec(adbCommand, async (error, stdout, stderr) => {
        if (error) {
            console.error('截图错误:', error)
            return
        }
        if (stderr) {
            console.error('截图错误:', stderr)
            return
        }
        // 检查 stdout 是否包含 "file pulled" 字符串
        if (stdout.includes("file pulled")) {
            await getGearInfo()
            src.value = 'screenshot.png?v=' + Math.random().toString(36).substring(7)
        } else {
            console.error("截图失败，未能成功拉取文件")
        }
    })
    const activeElement = document.activeElement as HTMLElement
    if (activeElement) {
        activeElement.blur()
    }
}

//Ocr识别
const textOcr = async (imagePath: string): Promise<any> => {
    // 准备待发送的指令
    const imgObj = { "image_path": path.join(process.cwd(), imagePath) }
    const imgStr = JSON.stringify(imgObj) + "\n"
    child.stdin.write(imgStr)
}

//获取装备信息
const getGearInfo = async () => {
    const processedImagePath = 'gear_info.png'
    const cropOptions = { left: 35, top: 102, width: 435, height: 500 }
    const blackOverlay = Buffer.from(
        `<svg width="435" height="500">
                <rect x="0" y="0" width="80" height="60" fill="black" />
                <rect x="0" y="380" width="435" height="60" fill="black" />
                <rect x="0" y="50" width="435" height="110" fill="black" />
                <rect x="132" y="20" width="50" height="50" fill="black" />
                <rect x="0" y="160" width="50" height="60" fill="black" />
                <rect x="0" y="210" width="435" height="30" fill="black" />
                <rect x="0" y="440" width="60" height="60" fill="black" />
                <rect x="165" y="440" width="80" height="60" fill="black" />
        </svg>`
    )
    await sharp('screenshot.png')
        .resize(1600, 900)
        .extract(cropOptions)
        .composite([{ input: blackOverlay, top: 0, left: 0 }])
        .toFile(processedImagePath)
    await textOcr(processedImagePath)
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

onUnmounted(() => {
    child.kill()
})
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
  