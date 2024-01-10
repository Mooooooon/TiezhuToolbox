<template>
    <el-row>
        <el-col :span="10">
            <el-row>
                <el-col :span="6">
                    <el-button @click="takeScreenshot">截图</el-button>
                </el-col>
                <el-col :span="10">
                    <el-radio-group v-model="uiIndex">
                        <el-radio-button label="1">强化</el-radio-button>
                        <el-radio-button label="2">背包</el-radio-button>
                    </el-radio-group>
                </el-col>
                <el-col :span="8">
                    <el-switch v-model="autoSwich" inline-prompt active-text="自动切换" inactive-text="关闭自动" />
                </el-col>
            </el-row>
            <el-descriptions v-if="enhancedRecommendation" class="gear-info" title="装备信息" :column="1">
                <el-descriptions-item label="强化等级">
                    {{ enhancementLevel !== undefined ? '+' + enhancementLevel : '' }}
                </el-descriptions-item>
                <el-descriptions-item label="主属性">
                    {{ primaryAttribute[0] }} {{ primaryAttribute[1] }}
                </el-descriptions-item>
                <el-descriptions-item v-for="(item, index) in attribute" :key="index" :label="item[0]">
                    {{ item[1] }}
                </el-descriptions-item>
                <el-descriptions-item label="套装">{{ set }}</el-descriptions-item>
                <el-descriptions-item label="分数">{{ score }}</el-descriptions-item>
                <el-descriptions-item label="预期分数">{{ expectantScore }}</el-descriptions-item>
            </el-descriptions>
        </el-col>
        <el-col :span="14">
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
                                    <el-descriptions-item label="匹配度">
                                        <el-tooltip class="box-item" effect="dark" :content="String(hero.matchDegree)"
                                            placement="bottom" :hide-after="0">
                                            <el-rate v-model="hero.matchDegree" disabled show-score text-color="#ff9900"
                                                :size="'small'" score-template="" />
                                        </el-tooltip>
                                    </el-descriptions-item>
                                    <el-descriptions-item v-for="(attribute, index) in hero.attributes" :key="index"
                                        :label="attribute[0]">
                                        <el-tooltip class="box-item" effect="dark" :content="String(attribute[1])"
                                            placement="bottom" :hide-after="0">
                                            <el-rate v-model="attribute[1]" disabled show-score text-color="#ff9900"
                                                :size="'small'" score-template="" />
                                        </el-tooltip>
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
const uiIndex = ref('1')
const autoSwich = ref(true)
let configData = require(path.join(process.cwd(), 'tiezhu.config.json'))
let tiezhuConfig = ref(configData)
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
    matchDegree: number
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
    //重新加载配置文件
    delete require.cache[require.resolve(path.join(process.cwd(), 'tiezhu.config.json'))]
    configData = require(path.join(process.cwd(), 'tiezhu.config.json'))
    tiezhuConfig.value = configData
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
        console.log(strOut)
        try {
            let jsonOutput = JSON.parse(strOut)
            if (jsonOutput.code === 100) {
                let gearInfo = jsonOutput.data.filter((item: { score: number }) => item.score >= 0.5).map((item: { text: string }) => item.text)
                console.log(gearInfo)
                if (gearInfo.length < 8) {
                    if (autoSwich.value !== true) {
                        ElMessage({
                            message: '数据可能不正确，请确认图片内容',
                            type: 'error',
                        })
                        console.log("数据可能不正确，请确认图片内容")
                    }
                    return
                }

                //获取强化等级
                const matchResult = gearInfo[0].match(/\d+/)
                if (matchResult) {
                    enhancementLevel.value = parseInt(matchResult[0])
                    gearInfo.shift() // 移除数组的第一个元素
                } else {
                    enhancementLevel.value = 0
                }
                // 获取装备级别和装备部位
                // let tier = gearInfo[0].slice(0, 2) 暂时用不到
                part.value = gearInfo[0].slice(2)
                gearInfo.shift()
                //是否自动切换
                const isPart = ["项链", "戒指", "鞋子", "武器", "头盔", "铠甲"].includes(part.value)
                if (autoSwich.value === true && !isPart) {
                    return
                }
                //获取主属性
                primaryAttribute.value = gearInfo.slice(0, 2)
                gearInfo.splice(0, 2)
                //获取套装
                let lastItem = gearInfo[gearInfo.length - 1]
                const indexOfSuit = lastItem.indexOf("套")
                if (indexOfSuit !== -1) {
                    set.value = lastItem.slice(0, indexOfSuit)
                }
                gearInfo.pop()
                //获取副属性
                const enhancementIndex = gearInfo.indexOf("强化+12时获得")
                if (enhancementIndex !== -1) {
                    gearInfo = gearInfo.slice(0, enhancementIndex)
                }
                type AttributePair = [string, string]
                let pairedAttributes: AttributePair[] = []
                for (let i = 0; i < gearInfo.length; i += 2) {
                    // 使用正则表达式匹配并保留中文字符 防止识别到重铸标志
                    const matchedChinese = gearInfo[i].match(/[\u4e00-\u9fa5]/g)
                    const chineseOnly = matchedChinese ? matchedChinese.join('') : ''
                    pairedAttributes.push([chineseOnly, gearInfo[i + 1]])
                }
                attribute.value = pairedAttributes
                //计算分数
                score.value = calculateScore(attribute.value)
                //装备推荐
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
    const isSpecialPart = ["项链", "戒指", "鞋子"].includes(part.value)
    let primaryAttributeName = isSpecialPart ? translateStatName(primaryAttribute.value[0]) : ''

    const uniqueAttributes = new Set(resultArray)
    // 计算每个英雄的优先级
    const heroPriorities = heros.data.flatMap(hero => {
        let priority = 0
        let attributesArray: any[][] = []
        let highWeightAttributesCount = 0 // 用于统计权重大于1的属性数量
        let matchDegree = 0
        let matchDegreeScore = 0
        uniqueAttributes.forEach(cnName => {
            const engName = translateStatName(cnName)
            const attributePriority = hero[engName] || 0
            if (engName !== 'cri' && attributePriority > 1) {
                highWeightAttributesCount++
            }
            //因为暴击容易歪，不需要暴击的角色也会拥有部分暴击，提高对暴击的权重需求
            if (engName === 'cri' && attributePriority >= 1.5) {
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
            if (primaryAttributePriority <= 2) {
                return [] // 主属性不满足条件，跳过此英雄
            }
        }
        attribute.value.forEach(attr => {
            const engName = translateStatName(attr[0])
            //计算分数x权重
            matchDegreeScore += calculateScore([attr]) * hero[engName]
        })
        //计算匹配度
        const tempData = { ...hero }
        delete tempData['heroCode']
        delete tempData['rate']
        delete tempData['equip_list']
        const values = Object.values(tempData).map(value => value as number)
        const maxValue = Math.max(...values)
        matchDegree = Math.round((matchDegreeScore / (score.value * maxValue)) * 5 * 100) / 100
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
        return [{ heroCode: hero.heroCode, attributes: attributesArray, priority, rate: hero.rate, avatar: imagePath, equipImages, matchDegree }]
    })


    // 过滤掉priority小于等于5和匹配度小于3的英雄
    let filteredHeroes = heroPriorities.filter(hero => hero.priority > tiezhuConfig.value.hero.priority)
    filteredHeroes = heroPriorities.filter(hero => hero.matchDegree >= tiezhuConfig.value.hero.matchDegree)

    topHeroes.value = filteredHeroes.sort((a, b) => b.matchDegree - a.matchDegree)
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

    //判断ui位置
    if (uiIndex.value === '1' || autoSwich.value === true) {
        const cropOptions = { left: 35, top: 102, width: 435, height: 500 }
        const blackOverlay = Buffer.from(
            `<svg width="435" height="500">
                <rect x="0" y="0" width="85" height="60" fill="black" />
                <rect x="55" y="32" width="80" height="20" fill="black" />
                <rect x="0" y="380" width="435" height="60" fill="black" />
                <rect x="0" y="50" width="435" height="110" fill="black" />
                <rect x="0" y="160" width="45" height="60" fill="black" />
                <rect x="0" y="210" width="435" height="30" fill="black" />
                <rect x="0" y="440" width="60" height="60" fill="black" />
        </svg>`
        )
        await Sharp(path.join('temp', 'screenshot.png')) // 使用 path.join 拼接路径
            .resize(1600, 900)
            .extract(cropOptions)
            .composite([{ input: blackOverlay, top: 0, left: 0 }])
            .toFile(processedImagePath)
        await textOcr(processedImagePath)
    }
    if (uiIndex.value === '2' || autoSwich.value === true) {
        const cropOptions = { left: 415, top: 137, width: 370, height: 550 }
        const blackOverlay = Buffer.from(
            `<svg width="370" height="550">
                <rect x="0" y="0" width="85" height="60" fill="black" />
                <rect x="55" y="32" width="80" height="20" fill="black" />
                <rect x="0" y="440" width="370" height="60" fill="black" />
                <rect x="0" y="50" width="370" height="200" fill="black" />
                <rect x="0" y="250" width="45" height="60" fill="black" />
                <rect x="0" y="290" width="435" height="30" fill="black" />
                <rect x="0" y="490" width="60" height="60" fill="black" />
        </svg>`
        )
        await Sharp(path.join('temp', 'screenshot.png')) // 使用 path.join 拼接路径
            .resize(1600, 900)
            .extract(cropOptions)
            .composite([{ input: blackOverlay, top: 0, left: 0 }])
            .toFile(processedImagePath)
        await textOcr(processedImagePath)
    }
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
    const leftScore = tiezhuConfig.value.scoreThreshold.left
    const rightScore = tiezhuConfig.value.scoreThreshold.right

    if (["武器", "铠甲", "头盔"].includes(part.value)) {
        if (enhancementLevel.value < 3 && score.value >= leftScore) return "继续强化"
        else if (enhancementLevel.value < 6 && score.value >= leftScore + 6) return "继续强化"
        else if (enhancementLevel.value < 9 && score.value >= leftScore + 12) return "继续强化"
        else if (enhancementLevel.value < 12 && score.value >= leftScore + 18) return "继续强化"
        else if (enhancementLevel.value < 15 && score.value >= leftScore + 24) return "继续强化"
        else if (enhancementLevel.value == 15 && score.value >= leftScore + 30) return "建议重铸"
        else {
            let speed = 0
            for (let [name, value] of attribute.value) {
                if (name == "速度") {
                    speed = parseInt(value)
                }
            }
            if (enhancementLevel.value < 3 && speed >= 3) return "继续赌速度"
            else if (enhancementLevel.value < 6 && speed >= 6) return "继续赌速度"
            else if (enhancementLevel.value < 9 && speed >= 9) return "继续赌速度"
            else if (enhancementLevel.value < 12 && speed >= 12) return "继续赌速度"
            else if (enhancementLevel.value < 15 && speed >= 12) return "继续赌速度"
            else if (enhancementLevel.value == 15 && speed >= 15) return "建议重铸"
            else return "分数过低，建议放弃"
        }
    } else {
        if (["攻击力", "防御力", "生命值"].includes(primaryAttribute.value[0]) && !primaryAttribute.value[1].includes('%')) {
            return "固定值主属性，建议放弃"
        }
        else {
            if (enhancementLevel.value < 3 && score.value >= rightScore) return "继续强化"
            else if (enhancementLevel.value < 6 && score.value >= rightScore + 6) return "继续强化"
            else if (enhancementLevel.value < 9 && score.value >= rightScore + 12) return "继续强化"
            else if (enhancementLevel.value < 12 && score.value >= rightScore + 18) return "继续强化"
            else if (enhancementLevel.value < 15 && score.value >= rightScore + 24) return "继续强化"
            else if (enhancementLevel.value == 15 && score.value >= rightScore + 30) return "建议重铸"
            if (["项链", "戒指"].includes(part.value)) {
                let speed = 0
                for (let [name, value] of attribute.value) {
                    if (name == "速度") {
                        speed = parseInt(value)
                    }
                }
                if (enhancementLevel.value < 3 && speed >= 3) return "继续赌速度"
                else if (enhancementLevel.value < 6 && speed >= 6) return "继续赌速度"
                else if (enhancementLevel.value < 9 && speed >= 9) return "继续赌速度"
                else if (enhancementLevel.value < 12 && speed >= 12) return "继续赌速度"
                else if (enhancementLevel.value < 15 && speed >= 12) return "继续赌速度"
                else if (enhancementLevel.value == 15 && speed >= 15) return "建议重铸"
                else return "分数过低，建议放弃"
            }
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
  