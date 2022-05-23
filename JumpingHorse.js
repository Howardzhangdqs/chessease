const screenshot = require("desktop-screenshot");
const getPixels  = require("get-pixels");
const chalk      = require("chalk");
const robot      = require("robotjs");
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/* 自定义（请根据您的国象联盟软件自行修改） */

const Theme_color = [113, 134, 184];    // 主题色（默认[113, 134, 184]）
const Fault_Tolerant = 2;                // 容错
const Judge_factor = 300;                // 棋盘的大致长宽（用于判定棋盘位置，需要保证小于真实大小）
const Robot_factor = 0.8;                // Robotjs的缩放参数（请各位按照自己的Robotjs调一下）
const Time_interval = 500;                // 每次点击的间隔时间（单位: 毫秒）
const Time_Interval = 100;                // 每轮点击之间的间隔时间（单位: 毫秒）

const img_path = "screenshot.png";

/* 程序部分（基于BUG运行，非专业人士请勿乱改） */

var cb;                    // 棋盘大小
var pic;                // 屏幕截图
var cb_content = [];    // 棋盘内容
var pend;

var vis = [], tot, ans = [];
var dx = [0, 1, 1, 2, 2, -1, -1, -2, -2];
var dy = [0, 2, -2, -1, 1, 2, -2, 1, -1];

/* 深搜 */
var dfs = function(x, y, n) {
    if (n == 0) return true;
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

// 获取格子内容
var get_block = function(x, y) {
    let t = trans_(x, y);
    let r = pic.get(t[0], t[1], 0), g = pic.get(t[0], t[1], 1), b = pic.get(t[0], t[1], 2);
    if (check_iscolor([r, g, b], [0, 0, 0])) return "P";
    for (let i = 1; i <= cb[2] / 16 - 2; i ++) {
        r = pic.get(t[0] + i, t[1], 0), g = pic.get(t[0] + i, t[1], 1), b = pic.get(t[0] + i, t[1], 2);
        if (r + g + b < 80) return "K";
    }
    return ".";
}

var run_robot = async function() {
    await wait(ans.length * Time_Interval);
    for (let i in ans) {
        let t = trans_(ans[i][0], ans[i][1]);
        robot.moveMouse(t[0] * Robot_factor, t[1] * Robot_factor);
        robot.mouseClick()
        pend = [ans[i][0], ans[i][1]];
        await wait(Time_interval);
    }
    await wait(500); // 五百毫秒延时等待国象联盟下一轮加载完毕
    main();
}

// 获取棋盘内容
var get_checkerboard_ = function() {
    tot = 0;
    let start;
    ans = [];
    for (let x = 1; x <= 8; x ++)
        for (let y = 1; y <= 8; y ++) {
            cb_content[x][y] = get_block(x, y);
            if (cb_content[x][y] == "P") tot ++;
            if (cb_content[x][y] == "K") start = [x, y];
        }
    //print_checkerboard();
    //if (start == undefined) start = pend;
    dfs(start[0], start[1], tot);
    print_checkerboard_();
    //console.log(ans);
    run_robot();
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
    cb_content = [], tot = 0, vis = [], ans = [];
    for (let i = 1; i <= 9; i ++) cb_content.push([0, 0, 0, 0, 0, 0, 0, 0, 0]);
    for (let i = 1; i <= 9; i ++) vis.push([false, false, false, false, false, false, false, false, false]);
    
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
