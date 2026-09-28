const [name, replacement = "wiki:inspect"] = process.argv.slice(2);

if (!name) {
  process.stderr.write("用法：retired-tool.mjs <舊入口> [替代入口]\n");
  process.exitCode = 1;
} else {
  process.stderr.write(`「${name}」已退出日常操作，保留原始程式僅供稽核；不會執行舊寫入。\n替代方式：npm.cmd run ${replacement}\n`);
  process.exitCode = 1;
}
