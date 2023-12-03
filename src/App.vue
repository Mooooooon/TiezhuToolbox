<script setup lang="ts">
import Header from './components/Header.vue'
import Footer from './components/Footer.vue'
import Welcome from './components/Welcome.vue'
</script>

<template>
  <div class="common-layout" style="height: 100%;">
    <el-container style="height: 100%;">
      <el-header>
        <Header></Header>
      </el-header>
      <el-main>
        <Welcome></Welcome>
      </el-main>
      <el-footer class="toolbox-footer">
        <Footer></Footer>
      </el-footer>
    </el-container>
  </div>
</template>

<style>
.toolbox-footer {
  line-height: 60px;
}
</style>
