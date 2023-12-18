<template>
    <el-row>
        <el-col :span="10">
            <el-button @click="takeScreenshot">截图</el-button>
            <el-text class="mx-1"> 请打开强化装备界面</el-text>
            <el-descriptions v-if="enhancedRecommendation" class="gear-info" title="装备信息" :column="1">
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
                <el-descriptions-item label="套装">{{ set }}</el-descriptions-item>
                <el-descriptions-item label="分数">{{ score }}</el-descriptions-item>
                <el-descriptions-item label="预期分数">{{ expectantScore }}</el-descriptions-item>
            </el-descriptions>
        </el-col>
        <el-col :span="14">
            <!-- <el-row>
                <el-col>
                    <el-image v-if="src" :src="src">
                        <template #placeholder>
                            <div class="image-slot">Loading<span class="dot">...</span></div>
                        </template>
                    </el-image>
                </el-col>
            </el-row> -->
            <el-row v-if="enhancedRecommendation">
                <el-col>
                    <el-text class="mx-1" size="large">强化建议：</el-text>
                    <el-text class="mx-1" size="large">{{ enhancedRecommendation }}</el-text>
                </el-col>
                <el-col style="margin-top: 10px; margin-bottom: 10px;">
                    <el-text class="mx-1" size="large">可用英雄：</el-text>
                </el-col>
                <el-col>
                    <el-scrollbar style="height: 320px; overflow-y: auto;min-width: 300px;">
                        <el-row v-if="enhancedRecommendation">
                            <!-- topHeroes中的el-col部分移入el-scrollbar -->
                            <el-col :span="12" v-for="hero in topHeroes" :key="hero.heroCode">
                                <el-row style="margin-bottom: 0;">
                                    <el-col :span="7">
                                        <el-avatar :size="50" :src="hero.avatar" />
                                    </el-col>
                                    <el-col :span="17">
                                        <el-row style="margin-bottom: 0;">
                                            <el-col style="margin-top: 7px;">
                                                <el-image v-for="equipImage in hero.equipImages"
                                                    style="width: 20px; margin-right: 5px;" :src="equipImage.imagePath" />
                                            </el-col>
                                            <el-col>
                                                <el-text class="mx-1" size="small">套装使用率:{{ hero.rate }}%</el-text>
                                            </el-col>
                                        </el-row>
                                    </el-col>
                                </el-row>
                                <el-descriptions :size="'small'" :column="1" class="hero-info">
                                    <el-descriptions-item v-for="(attribute, index) in hero.attributes" :key="index"
                                        :label="attribute[0]">
                                        <el-rate v-model="attribute[1]" disabled show-score text-color="#ff9900"
                                            :size="'small'" score-template="" />
                                    </el-descriptions-item>
                                </el-descriptions>
                            </el-col>
                        </el-row>
                    </el-scrollbar>
                </el-col>
            </el-row>
        </el-col>
    </el-row>
</template>

<script lang="ts" setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { exec, spawn } from 'child_process'
import { useAdbStore } from '../store/adb'
import path from 'path'
import fs from 'fs'
import { ElMessage } from 'element-plus'
import { ipcRenderer } from 'electron'

const Sharp = require('sharp')
const src = ref('')
const adbStore = useAdbStore()
const selectedDeviceId = adbStore.device
const enhancementLevel = ref(0)
const part = ref('')
const primaryAttribute = ref<string[]>(['', ''])
const attribute = ref<[string, string][]>([["", ""], ["", ""], ["", ""], ["", ""]])
const score = ref(0)
const enhancedRecommendation = ref('')
const expectantScore = ref(0)
const set = ref('')
interface HeroAttribute {
    [index: number]: [string, number] // [属性名称, 属性值]
}
interface Hero {
    heroCode: string
    attributes: HeroAttribute[]
    priority: number
    rate: number
    avatar: string
    equipImages: EquipImage[]
}
interface EquipImage {
    equipCode: string // 装备编码
    imagePath: string // 装备图片路径
}
// 使用 ref 创建响应式引用
const topHeroes = ref<Hero[]>([])
const setMapping: { [key: string]: string } = {
    "破灭": "set_cri_dmg",
    "愤怒": "set_rage",
    "命中": "set_acc",
    "穿透": "set_penetrate",
    "攻击": "set_att",
    "抵抗": "set_res",
    "憎恨": "set_revenge",
    "防御": "set_def",
    "吸血": "set_vampire",
    "伤口": "set_scar",
    "生命值": "set_max_hp",
    "反击": "set_counter",
    "守护": "set_shield",
    "速度": "set_speed",
    "夹攻": "set_coop",
    "激流": "set_torrent",
    "暴击": "set_cri",
    "免疫": "set_immune"
}
type StatsMapping = {
    [key in string]: string
}
const statsMapping: StatsMapping = {
    "攻击力": "att",
    "防御力": "def",
    "生命值": "max_hp",
    "效果命中": "acc",
    "效果抗性": "res",
    "速度": "speed",
    "暴击伤害": "cri_dmg",
    "暴击率": "cri"
}

onMounted(() => {
    ElMessage('始化中……')
})
const child = spawn(path.join(process.cwd(), 'PaddleOCR-json', 'PaddleOCR-json.exe'), {
    cwd: path.join(process.cwd(), 'PaddleOCR-json'),
    stdio: ['pipe', 'pipe', 'pipe']
})
const translateSetName = (cnName: string) => {
    return setMapping[cnName]
}
const translateStatName = (cnStatName: string): string => {
    return statsMapping[cnStatName]
}

// 从子进程接收数据
child.stdout.on('data', (data: Buffer) => {
    let strOut: string = data.toString()
    // 检测启动成功
    if (strOut.includes('OCR init completed.')) {
        console.log('初始化完成！')
        ElMessage({
            message: '初始化完成！',
            type: 'success',
        })
    } else if (strOut.includes('PaddleOCR-json v1.3.0')) {
        console.log(strOut)
    } else {
        try {
            let jsonOutput = JSON.parse(strOut)
            if (jsonOutput.code === 100) {
                const gearInfo = jsonOutput.data.filter((item: { score: number }) => item.score >= 0.5).map((item: { text: string }) => item.text)
                if (gearInfo[9] === '强化+12时获得') {
                    // 删除下标为9的元素
                    gearInfo.splice(9, 1)
                    gearInfo.splice(9, 1)
                    // 在下标9和10之间插入两个空字符串
                    gearInfo.splice(9, 0, '', '')
                }
                if (gearInfo.length === 12) {
                    // 在第一项添加 "+0"
                    gearInfo.unshift("+0")
                }
                if (gearInfo.length !== 13) {
                    ElMessage({
                        message: '数据可能不正确，请确认图片内容',
                        type: 'error',
                    })
                    console.log("数据可能不正确，请确认图片内容")
                    return
                }
                enhancementLevel.value = parseInt(gearInfo[0].replace("+", ""), 10) || 0 // 强化等级 去掉 "+" 并转化为数字
                part.value = gearInfo[1]
                const mergedItem = []
                mergedItem.push(gearInfo[2])
                mergedItem.push(gearInfo[3])
                primaryAttribute.value = mergedItem
                const mergedItems = []
                for (let i = 4; i < gearInfo.length; i += 2) {
                    if (i + 1 < gearInfo.length) {
                        const mergedArray = [gearInfo[i], gearInfo[i + 1]]
                        mergedItems.push(mergedArray)
                    }
                }
                attribute.value = mergedItems as [string, string][]


                const original_string = gearInfo[12]
                const modified_string = original_string.replace("套", "").replace("装", "")
                set.value = modified_string
                score.value = calculateScore(attribute.value)
                enhancedRecommendation.value = calculateAnalysis()
                expectantScore.value = parseFloat((expectant() + score.value).toFixed(2))

                ipcRenderer.send('query-database', translateSetName(set.value))
            } else {
                if (jsonOutput.code === 101) {
                    ElMessage({
                        message: '没有获取到数据，请确认图片内容',
                        type: 'error',
                    })
                }
                console.log('Code is not 100, original output:', strOut)
            }
        } catch (e) {
            console.error('Error parsing JSON:', e)
        }
    }
})

const queryResultListener = (event: any, result: { error?: any; data: any }) => {
    if (result.error) {
        console.error('Error in database query', result.error)
    } else {
        recommendGear(result)
    }
}
// 监听sql
ipcRenderer.on('query-result', queryResultListener)

const recommendGear = (heros: { data: any[] }) => {
    const resultArray = attribute.value
        .map(item => item[0]) // 获取 item[0] 的值
        .filter(item => item !== '') // 使用 filter 去掉空字符串
    const isSpecialPart = ["项链", "戒指", "鞋子"].includes(part.value)
    let primaryAttributeName = isSpecialPart ? translateStatName(primaryAttribute.value[0]) : ''

    const uniqueAttributes = new Set(resultArray)
    // 计算每个英雄的优先级
    const heroPriorities = heros.data.flatMap(hero => {
        let priority = 0
        let attributesArray: any[][] = []
        let highWeightAttributesCount = 0 // 用于统计权重大于1的属性数量

        uniqueAttributes.forEach(cnName => {
            const engName = translateStatName(cnName)
            const attributePriority = hero[engName] || 0
            if (attributePriority > 1) {
                highWeightAttributesCount++
            }
            attributesArray.push([cnName, attributePriority])
        })

        // 检查是否至少有三个属性的权重大于1
        if (highWeightAttributesCount < 3) {
            return [] // 条件不满足，跳过此英雄
        }

        if (isSpecialPart && primaryAttributeName) {
            // 检查主属性优先级
            const primaryAttributePriority = hero[primaryAttributeName] || 0
            if (primaryAttributePriority <= 3) {
                return [] // 主属性不满足条件，跳过此英雄
            }
        }

        // 解析 "equip_list" 字段为数组
        const equipList = JSON.parse(hero.equip_list)
        // 遍历装备列表，为每个装备生成图片路径
        const equipImages = equipList.map((equipCode: string) => {
            const imagePath = path.join('tiezhu:', process.cwd(), 'avatar', equipCode + '.png')
            return { equipCode, imagePath }
        })
        priority = attributesArray.reduce((total, [_, value]) => total + value, 0)

        const imagePath = path.join('tiezhu:', process.cwd(), 'avatar', hero.heroCode + '.png')

        // 构建返回值对象，将解析后的 "equip_list" 添加到返回值中
        return [{ heroCode: hero.heroCode, attributes: attributesArray, priority, rate: hero.rate, avatar: imagePath, equipImages }]
    })


    // 过滤掉priority小于等于5的英雄
    const filteredHeroes = heroPriorities.filter(hero => hero.priority > 5)

    topHeroes.value = filteredHeroes.sort((a, b) => b.priority - a.priority)
}





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
    if (adbStore.status === 0) {
        ElMessage({
            message: '尚未连接',
            type: 'error',
        })
        return
    }
    const adbPath = path.join(process.cwd(), 'platform-tools', 'adb.exe')
    const tempFolderPath = path.join(process.cwd(), 'temp') // 指定temp文件夹的路径
    const screenshotFilePath = path.join(tempFolderPath, 'screenshot.png') // 指定截图文件的路径
    const adbCommand = adbPath + ' -s ' + selectedDeviceId + ' shell screencap -p /sdcard/screenshot.png && ' + adbPath + ' -s ' + selectedDeviceId + ' pull /sdcard/screenshot.png ' + screenshotFilePath

    // 检查temp文件夹是否存在，不存在则创建它
    if (!fs.existsSync(tempFolderPath)) {
        fs.mkdirSync(tempFolderPath)
    }
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
            const randomVersion = Math.random().toString(36).substring(7)
            const imagePath = path.join('tiezhu:', process.cwd(), 'temp', 'screenshot.png')
            src.value = `${imagePath}?v=${randomVersion}`
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
    const processedImagePath = path.join('temp', 'gear_info.png') // 使用 path.join 拼接路径
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
    await Sharp(path.join('temp', 'screenshot.png')) // 使用 path.join 拼接路径
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
    //停止监听
    ipcRenderer.removeListener('query-result', queryResultListener)

    // 杀死子进程（如果有的话）
    if (child) {
        child.kill()
    }

    // 删除temp文件夹下的所有图片文件
    const tempFolderPath = path.join(process.cwd(), 'temp')
    if (fs.existsSync(tempFolderPath)) {
        fs.readdirSync(tempFolderPath).forEach((file) => {
            const filePath = path.join(tempFolderPath, file)
            if (fs.statSync(filePath).isFile() && /\.(png|jpg|jpeg|gif|bmp)$/i.test(file)) {
                fs.unlinkSync(filePath) // 删除图片文件
            }
        })
    }
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

.gear-info .el-descriptions__cell {
    padding-bottom: 5px !important;
}

.hero-info .el-descriptions__label {
    width: 48px;
    display: inline-block;
}

.hero-info .el-descriptions__cell {
    padding-bottom: 0 !important;
    line-height: 18px !important;
}

.hero-info {
    margin-bottom: 10px;
}
</style>
  