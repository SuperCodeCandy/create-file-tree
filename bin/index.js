#!/usr/bin/env node

const path = require("path");
const fs = require("fs");
const bashArgv = process.argv;
const OUTPUT_KEY = "output";
const EXITS_REGEXP = /^--(ignoreDir|ignoreFile)=(\/.*\/)$/;
const EXITS_FIXED_KEY = /^--(prefix|isLogFileTree|isCreateFile)=(.*)$/;

const createRegexp = (str) => {
  const [_, reg, modifier] = str.match(/\/(.*)\/(.*)/);
  return new RegExp(reg, modifier);
};

const config = {
  prefix: "├─── ",
  output: path.join(process.cwd(), "./file-tree.txt"),
  isLogFileTree: "true",
  isCreateFile: "true",
};

bashArgv.forEach((item) => {
  const [_1, exitsRegexpKey, exitsRegexpValue] = item.match(EXITS_REGEXP) || [];
  if (exitsRegexpKey && exitsRegexpValue) {
    config[exitsRegexpKey] = createRegexp(exitsRegexpValue);
  }

  const [_2, exitsFixedKey, exitsFixedValue] =
    item.match(EXITS_FIXED_KEY) || [];
  if (exitsFixedKey && exitsFixedValue) {
    config[exitsFixedKey] = exitsFixedValue;
  }

  if (item.startsWith(`--${OUTPUT_KEY}`) && item.split("=")[1]) {
    config.output = path.join(process.cwd(), item.split("=")[1]);
  }
});

function createFileMap(filePath = process.cwd()) {
  const fileMap = {};
  const allFileInfo = fs.readdirSync(filePath);
  for (const fileName of allFileInfo) {
    const statsPath = path.join(filePath, fileName);
    const stats = fs.statSync(statsPath);
    if (
      stats.isDirectory() &&
      (!config.ignoreDir || !config.ignoreDir.test(fileName))
    ) {
      const result = createFileMap(statsPath);
      fileMap[fileName] = result;
    } else if (
      stats.isFile() &&
      (!config.ignoreFile || !config.ignoreFile.test(fileName))
    ) {
      fileMap[fileName] = undefined;
    }
  }
  return fileMap;
}

function createFileTree(fileMap, index = 1) {
  let fileTree = "";
  const dir = Object.keys(fileMap).filter((item) => fileMap[item]);
  const file = Object.keys(fileMap).filter((item) => !fileMap[item]);
  const fileStart = config.prefix.repeat(index);
  dir.forEach((item) => {
    fileTree += `${fileStart}${item}\n`;
    if (Object.keys(fileMap[item]).length > 0) {
      fileTree += createFileTree(fileMap[item], index + 1);
    }
  });
  file.forEach((item) => {
    fileTree += `${fileStart}${item}\n`;
  });
  return fileTree;
}

const beginTime = new Date().getTime();
const fileTree = createFileTree(createFileMap());

function logFunc(isLog, isLogFile) {
  const gap = new Date().getTime() - beginTime;
  if (isLog) {
    console.log(
      `---------- file tree begin ----------\n\n${fileTree}\n---------- file tree end ----------\n---------- 耗时: ${gap}ms ----------\n`
    );
  }
  if (isLogFile) {
    console.log(`生成文件树成功，耗时：${gap}ms\n生成文件路径${config.output}`);
  }
}

if (config.isCreateFile === "true") {
  fs.writeFile(config.output, fileTree, (error, data) => {
    if (error) {
      console.log("创建fileTree文件失败");
      throw new Error(error);
    }
  });
  logFunc(config.isLogFileTree === "true", true);
} else {
  logFunc(true);
}
