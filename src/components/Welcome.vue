<template>
    <el-row>
        <el-autocomplete v-model="state" :fetch-suggestions="querySearch" placeholder="输入模拟器端口" @select="handleSelect"
            class="port-input" clearable>
            <template #default="{ item }">
                <span class="name">{{ item.name }}</span>
                <span class="value">{{ item.value }}</span>
            </template>
        </el-autocomplete>
    </el-row>
    <el-row>
        <el-button @click="connectADB">连接</el-button>
    </el-row>
</template>
  
<script lang="ts" setup>
import { onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { exec } from 'child_process'

interface NameItem {
    value: string
    name: string
}

const state = ref('')
const names = ref<NameItem[]>([])

const querySearch = (queryString: string, cb: (arg0: { value: string; name: string; }[]) => void) => {
    const results = queryString
        ? names.value.filter(createFilter(queryString))
        : names.value
    // call callback function to return suggestion objects
    cb(results)
}
const createFilter = (queryString: string) => {
    return (restaurant: { value: string; }) => {
        return (
            restaurant.value.toLowerCase().indexOf(queryString.toLowerCase()) === 0
        )
    }
}
const loadAll = () => {
    return [
        { value: '62001', name: '夜神模拟器' },
        { value: '16384', name: 'MuMu模拟器 12' },
        { value: '7555', name: 'MuMu模拟器 6' },
        { value: '6555', name: '天天模拟器' },
        { value: '5555', name: 'BlueStacks' },
    ]
}
const handleSelect = (item: NameItem) => {
    console.log(item)
}

const connectADB = () => {
    // Execute ADB command to connect
    ElMessage('模拟器连接中……')
    exec('adb connect 127.0.0.1:' + state.value, (error, stdout, stderr) => {
        if (error) {
            ElMessage.error(error.message)
            console.error(`Error connecting to ADB: ${error.message}`);
            return;
        }
        if (stderr) {
            ElMessage.error(stderr)
            console.error(`ADB stderr: ${stderr}`);
            return;
        }
        ElMessage({
            message: '模拟器连接成功。',
            type: 'success',
        })
        console.log(`ADB stdout: ${stdout}`);
    });
}
onMounted(() => {
    names.value = loadAll()
})
</script>
  
<style>
.port-input {
    width: 220px;
}

.name {
    width: 65%;
    display: block;
    float: left;
}

.value {
    width: 35%;
    display: block;
    float: left;
}

.el-row {
    margin-bottom: 10px;
}
</style>
  