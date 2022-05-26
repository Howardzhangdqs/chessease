const screenshot = require("desktop-screenshot");
const tesseract  = require('node-tesseract');
const getPixels  = require("get-pixels");
const robot      = require("robotjs");
const chalk      = require("chalk");
const jimp       = require('jimp');
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/* 自定义（请根据您的国象联盟软件自行修改） */

const Theme_color = [113, 134, 184];     // 主题色（默认[113, 134, 184]）
const Fault_Tolerant = 2;                // 容错
const Judge_factor = 300;                // 棋盘的大致长宽（用于判定棋盘位置，需要保证小于真实大小）
const Robot_factor = 0.8;                // Robotjs的缩放参数（请各位按照自己的Robotjs调一下）
const Time_interval = 400;               // 每次点击的间隔时间（单位: 毫秒）
const Time_Interval = 100;               // 每轮点击之间的间隔时间（单位: 毫秒）

const img_path = "screenshot.png";
const img_temp = "screenshot_temp.png";

const tess_options = { psm: "10 digits" };	// Tesseract参数，可根据喜好更改

/* 程序部分（基于BUG运行，非专业人士请勿乱改） */

var cb;                    // 棋盘大小
var pic;                // 屏幕截图
var cb_content = [];    // 棋盘内容
var pend;
var round_f;
var delay = 1000;

var vis = [], tot, ans = [];
var dx = [0, 1, 1, 2, 2, -1, -1, -2, -2];
var dy = [0, 2, -2, -1, 1, 2, -2, 1, -1];

/* 深搜 */
var dfs = function(x, y, n) {
	//console.log(x, y, n);
	//console.log();
	//print_checkerboard_();
    if (n == 0) return true;
    //if (n < 2) console.log(x, y, n);
    for (let i = 1; i <= 8; i ++) {
        if (x + dx[i] <= 0 || x + dx[i] > 8) continue;
        if (y + dy[i] <= 0 || y + dy[i] > 8) continue;
        if (cb_content[x + dx[i]][y + dy[i]] != 'P') continue;
        if (vis[x + dx[i]][y + dy[i]]) continue;
        vis[x + dx[i]][y + dy[i]] = true; ans.push([x + dx[i], y + dy[i]]);
        if (dfs(x + dx[i], y + dy[i], n - 1)) return true;
        vis[x + dx[i]][y + dy[i]] = false; ans.pop();
    }
    return false;
}

/* 同种颜色检测 */
var check_iscolor = function(ls, tc) {
    var check_t = (a, b, c) => (- Fault_Tolerant <= (b[a] - c[a]) && (b[a] - c[a]) <= Fault_Tolerant);
    if (check_t(0, ls, tc) && check_t(1, ls, tc) && check_t(2, ls, tc)) return true;
    return false;
}

// 打印棋盘内容（K:马; P:兵）
var print_checkerboard = function() {
    for (let x = 1; x <= 8; x ++) {
        for (let y = 1; y <= 8; y ++)
            process.stdout.write(cb_content[y][x] + " ");
        process.stdout.write("\n");
    }
}

// 打印棋盘内容（K:马; 数字:兵）
var print_checkerboard_ = function() {
    let tl = [];
    for (let i = 1; i <= 9; i ++) tl.push([".", ".", ".", ".", ".", ".", ".", ".", "."]);
    let j = 0;
    for (let i in ans) {
        tl[ans[i][0]][ans[i][1]] = ++ j;
    }
    
    for (let x = 1; x <= 8; x ++) {
        for (let y = 1; y <= 8; y ++)
            process.stdout.write(" " + cb_content[y][x] + " ");
        process.stdout.write("  ");
        for (let y = 1; y <= 8; y ++)
            process.stdout.write(("" + tl[y][x]).padStart(3,' '));
        process.stdout.write("\n");
    }
}

// 棋盘遮挡检查（懒得写了，自己把窗口放最顶上就好）
var check_ifcb_coverd = function() {
    //for (let x = cb[0]; x <= cb[0] + cb[2]; x ++) if (check_iscolor(x, cb[1]))
    return true;
};

// 将格点转换为图像位置
var trans_ = function(x, y) {
    //console.log(x, y, [Math.round(cb[0] - cb[2] / 16 + cb[2] / 8 * x), Math.round(cb[1] - cb[2] / 16 + cb[2] / 8 * y)])
    return [Math.round(cb[0] - cb[2] / 16 + cb[2] / 8 * x), Math.round(cb[1] - cb[2] / 16 + cb[2] / 8 * y)];
}

var trans_p2n = async function(t) {
	t = t.trim();
	if (t.length == 1 && t.charCodeAt() >= 49 && t.charCodeAt() <= 56) t = "f" + t;
	if ((t.trim()).length == 2 && !/^[A-Za-z]+$/.test(t)) {
		let tn = 57 - t[1].charCodeAt(), tp = t[0].charCodeAt() - 96;
		let tt = trans_(tp, tn);
		robot.moveMouse(tt[0] * Robot_factor, tt[1] * Robot_factor);
		robot.mouseClick();
		await wait(delay);
		if (delay >= 10) delay -= 10;
		console.log("点击成功");
	}
	//await wait(500);
	await screenshot(img_path, (async (error, complete) => {
        console.log();
        if (error) console.log(chalk.red("屏幕截图失败"), error);
        else {
            console.log(chalk.green("屏幕截图成功"));
			get_checkerboard_();
        }
    }));
}

// 获取格子内容
var get_block = async function(x, y) {
	//await wait(10000);
    let t = trans_(x, y);
    for (let i = 1; i <= cb[2] / 32 && ! round_f; i ++) {
        r = pic.get(t[0] + i, t[1], 0), g = pic.get(t[0] + i, t[1], 1), b = pic.get(t[0] + i, t[1], 2);
        if (check_iscolor([r, g, b], Theme_color)) {
		console.log(r, g, b);
			round_f = true;
			console.log(x, y);
			console.log(t[0] + i, t[1]);
			await jimp.read(img_path, async function (err, img) {
				if (err) console.log(chalk.red("识别错误"), err);
				else {
					await img.crop(t[0] - cb[2] / 16 + 2, t[1] - cb[2] / 16 + 2, cb[2] / 8 - 4, cb[2] / 8 - 4).write(img_temp);
					console.log("切图成功");
					await tesseract.process(img_temp, tess_options, async (err, res) => {
						if (err) {
							console.log(chalk.red("识别错误"), err);
						} else {
							console.log("OCR 识别出: " + res);
							trans_p2n(res);
						}
					});
				}
			})
		}
    }
}

// 获取棋盘内容
var get_checkerboard_ = async function() {
	await getPixels(img_path, async function(err, pixels) {
        if (err) {
            console.log("Bad image path"); return;
        } else {
            pic = pixels;
			tot = 0;
			let start;
			ans = [];
			//await wait(1000);
			console.log("重开"); round_f = false;
			for (let x = Math.floor(Math.random() * 1000) % 8 + 1, i = 1; i <= 8 && ! round_f; x = Math.floor(Math.random() * 1000) % 8 + 1, i ++)
				for (let y = 1; y <= 8 && ! round_f; y ++) {
					//console.log(x, y);
					if ((x + y) % 2 == 1) continue;
					await get_block(x, y);
				}
			await screenshot(img_path, (async (error, complete) => {
				console.log();
				if (error) console.log(chalk.red("屏幕截图失败"), error);
				else {
					console.log(chalk.green("屏幕截图成功"));
					get_checkerboard_();
				}
			}));
        }
    })
}

var get_checkerboard = (async () => {
    await getPixels(img_path, function(err, pixels) {
        if (err) {
            console.log("Bad image path"); return;
        } else {
            pic = pixels;
            console.log("截图大小:", pixels.shape[0], pixels.shape[1]);
            for (let x = 0; x < pixels.shape[0]; x ++)
                for (let y = 0; y < pixels.shape[1]; y ++) {
                    let r = pixels.get(x, y, 0), g = pixels.get(x, y, 1), b = pixels.get(x, y, 2);
                    if (check_iscolor([r, g, b], Theme_color)) {
                        let f = true, i = 1;
                        r = pixels.get(x, y + i, 0), g = pixels.get(x, y + i, 1), b = pixels.get(x, y + i, 2);
                        let pcolor = Theme_color;
                        while (check_iscolor([r, g, b], pcolor)) {
                            pcolor = [r, g, b];
                            i ++; r = pixels.get(x, y + i, 0), g = pixels.get(x, y + i, 1), b = pixels.get(x, y + i, 2);
                        }
                        if (i >= Judge_factor) {
                            console.log("棋盘位于:", x, y, "长宽:", i);
                            cb = [x, y, i];
                            if (check_ifcb_coverd()) get_checkerboard_();
                            return true;
                        } else break;
                    }
                }
            console.log(chalk.red("棋盘未找到"));
            return false;
        }
    })
});

let main = (async () => {
    await screenshot(img_path, (async (error, complete) => {
        console.log();
        if (error) console.log(chalk.red("屏幕截图失败"), error);
        else {
            console.log(chalk.green("屏幕截图成功"));
            cb = (await get_checkerboard());
        }
    }));
});

main();