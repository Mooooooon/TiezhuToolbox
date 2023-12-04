<template>
  <div class="common-layout" style="height: 100%;">
    <el-container style="height: 100%;">
      <el-header>
        <Header></Header>
      </el-header>
      <el-main>
        <Welcome v-if="menuStore.menuIndex === '1'" />
        <Blacksmith v-else-if="menuStore.menuIndex === '2'" />
      </el-main>
      <el-footer class="toolbox-footer">
        <Footer></Footer>
      </el-footer>
    </el-container>
  </div>
</template>

<script setup lang="ts">
import Header from './components/Header.vue'
import Footer from './components/Footer.vue'
import Welcome from './components/Welcome.vue'
import Blacksmith from './components/Blacksmith.vue'
import { useMenuStore } from './store/menu'

const menuStore = useMenuStore()
</script>

<style>
.toolbox-footer {
  line-height: 60px;
}
</style>
