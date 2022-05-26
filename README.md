# 基于`Nodejs`的国象联盟小游戏辅助程序

## 效果

![ttm](assets/ttm.png)

![ttm](assets/sjyk.png)

## 跳跳马辅助

`JumpingHorse.js`为跳跳马辅助

依赖库：`desktop-screenshot`、`get-pixels`、`chalk`、`robotjs`
（`chalk`确实很多余，但是用起来还是很方便的）

使用时在文件目录下会生成一个`screenshot.png`的截图文件，请确保您的手机模拟器中的棋盘能被完整截图，并且棋盘外框线宽度至少为一像素（颜色为`rgb(201, 209, 228)`，如果购买了其他主题色，可在`JumpingHorse.js`中修改）

程序启动后即会自动进行跳跳马，运行时不建议乱动鼠标，否则可能会导致误触。

可在一次跳跳马跳完后使用`Ctrl+C`结束程序。

其他两次跳跃的时间间隔具体可在`JumpingHorse.js`中修改。

## 手疾眼快辅助

依赖库：`desktop-screenshot`、`node-tesseract`、`get-pixels`、`robotjs`、`chalk`、`jimp`

需配置好的`Tesseract`，`config`白名单中新建`digit`文件，内容如下（就一行）：

```
tessedit_char_whitelist 12345678abcdefgh
```

请确保您的手机模拟器中的棋盘能被完整截图，并且棋盘外框线宽度至少为一像素（颜色为`rgb(201, 209, 228)`，如果购买了其他主题色，可在`JumpingHorse.js`中修改）

程序启动后即会自动进行手疾眼快，运行时不建议乱动鼠标，否则可能会导致误触。

退出判定还未完善，需在游戏结束后使用`Ctrl+C`结束程序。