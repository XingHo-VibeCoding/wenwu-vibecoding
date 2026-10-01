-- ============================================================
-- 《电子设备使用指南》种子数据（seed.sql）
-- 依据：api-contract.md 第 3 节「数据模型」（Day 16 定稿）
-- 日期：2026-10-01（Day 16｜第 3 周）
-- 执行顺序：先 db/schema.sql（建表），再本文件（灌数据）
--
-- 用法：整份粘贴到「数据管理 → SQL 编辑器」执行。
--       本脚本可反复执行：开头先清空 5 张表，再重新插入。
--
-- 警告：开头会 TRUNCATE 掉这 5 张表的全部数据（控制台会提示"破坏性操作"）。
--       本期数据全部来自本文件，随时能重灌，所以是安全的。
--
-- 数据来源（全部真实抽取，未编造一条）：
--   场景 + 步骤 + 前置条件  <- 根目录 index.html 第 544-686 行（4 个 <section class="scene">）
--   资源入口 6 条          <- 根目录 index.html 第 691-698 行（取页面完整文案）
--   仪器操作 34 条 / 6 台   <- web/src/data/mock.js 的 INSTRUMENT_OPS（同源于 index.html）
--   任务索引 8 条          <- mock.js 的 TASK_INDEX（同源于 index.html）
--
-- 三处如实记录的处理（不是偷懒，是有意的）：
--   1. 正文里的 <b> / <code> 强调标签已剥离，只保留文字。数据库不存 HTML 标签。
--      -> 代价：原页面里"传输文件""100%"这些加粗强调丢了。要加强调需另加字段，本期不做。
--   2. 难度 / 耗时今天未实测：difficulty_level、time_minutes 一律存 NULL，
--      measure_status 存 'pending'，scenes.difficulty / time_cost 存 '待实测'。不编数字。
--   3. tasks.keywords 前端目前是推导出来的，没有真实数据 -> 一律存 NULL，不编。
-- ============================================================


-- ------------------------------------------------------------
-- 第 0 步：清空旧数据 —— 这就是「可重复执行」的实现方式
-- RESTART IDENTITY：自增主键归零，反复跑出来的 id 序列一致
-- CASCADE：连带清掉外键依赖，不用手动按顺序删
-- ------------------------------------------------------------
TRUNCATE TABLE scenes, steps, resources, instruments, tasks
  RESTART IDENTITY CASCADE;


-- ------------------------------------------------------------
-- 1. scenes  场景主表（4 行 - 真实内容就是 4 个场景，不凑第 5 条）
-- ------------------------------------------------------------
INSERT INTO scenes
  (id, no, name, method, description, device_note, prerequisite, step_count, difficulty, time_cost, measure_status)
VALUES
  ('scene-1', 'S1', '实验数据 / 板书传电脑', 'USB 数据线',
   '手机拍的实验数据、板书照片怎么进电脑、进报告。',
   'Android + Windows',
   '一根能传数据的 USB 数据线（很多线只能充电，不能传文件）',
   5, '待实测', '待实测', 'pending'),

  ('scene-2', 'S2', '电脑文件传回手机', 'LocalSend 局域网',
   '报告、资料发到手机上预览、提交前检查。',
   'Android + Windows',
   '手机和电脑连同一个 Wi-Fi；两端装 LocalSend（开源免费，见资源入口）',
   5, '待实测', '待实测', 'pending'),

  ('scene-3', 'S3', '大文件传输', '网盘中转',
   '实验视频、安装包这类聊天工具传不动的大文件怎么传。',
   'Android + Windows',
   '任一网盘账号（百度网盘 / 阿里云盘等），电脑端用客户端或网页版',
   5, '待实测', '待实测', 'pending'),

  ('scene-4', 'S4', '资料两端同步', '云盘同步',
   '代码、笔记等学习资料在手机和电脑间的日常同步。',
   'Android + Windows',
   '选定一个同步盘（OneDrive 或坚果云），两端登录同一账号',
   5, '待实测', '待实测', 'pending');


-- ------------------------------------------------------------
-- 2. steps  步骤子表（20 行 = 4 个场景 x 5 步）
-- scene_id 就是那条关联字段，指向 scenes.id
-- caution 只有 4 条有值（S1 第1步 / S2 第2步 / S3 第1步 / S4 第5步），其余为 NULL
-- ------------------------------------------------------------
INSERT INTO steps
  (scene_id, order_no, content, difficulty_level, time_minutes, caution, measure_status)
VALUES
  -- S1 实验数据 / 板书传电脑
  ('scene-1', 1, '用数据线连接手机与电脑。手机通知栏会弹出「USB 用途」提示——点开它，选择「传输文件」。不选的话，电脑那边只能看到手机在充电。',
   NULL, NULL,
   '电脑完全没反应，九成是数据线只能充电——换一根再试；传文件期间保持手机亮屏解锁，锁屏后设备可能从电脑上消失。',
   'pending'),
  ('scene-1', 2, '电脑打开「此电脑」，设备列表里会出现你的手机（显示为品牌名，如 HUAWEI / Xiaomi）——双击进入，再进「内部存储」。',
   NULL, NULL, NULL, 'pending'),
  ('scene-1', 3, '进入 DCIM → Camera 文件夹，这里是你手机相机的原图，实验数据和板书照片都在里面。',
   NULL, NULL, NULL, 'pending'),
  ('scene-1', 4, '选中需要的照片，复制到电脑上的报告文件夹。建议按实验日期建子文件夹（如 2026-09-21-实验三），报告写到一半也好找。',
   NULL, NULL, NULL, 'pending'),
  ('scene-1', 5, '传完先在电脑任务栏「安全弹出」手机（或把手机通知栏的 USB 用途改回「仅充电」），再拔线——直接拔偶尔会损坏正在传输的文件。',
   NULL, NULL, NULL, 'pending'),

  -- S2 电脑文件传回手机
  ('scene-2', 1, '两端各装 LocalSend：手机在应用商店搜「LocalSend」，电脑去官网 localsend.org 下载安装包。',
   NULL, NULL, NULL, 'pending'),
  ('scene-2', 2, '确认手机关掉移动数据、与电脑连的是同一个 Wi-Fi——两端不在一个网里，后面全部白做。',
   NULL, NULL,
   '搜不到对方设备时，先查路由器是否开了「AP 隔离」（部分校园网区域会开）；急用可改开手机热点，让电脑连热点组网。',
   'pending'),
  ('scene-2', 3, '电脑端 LocalSend 点「发送」，选中要传回手机的文件（报告、课件、资料都行）。',
   NULL, NULL, NULL, 'pending'),
  ('scene-2', 4, '在设备列表里点你的手机头像 → 手机端立刻弹出接收请求 → 点「接收」。',
   NULL, NULL, NULL, 'pending'),
  ('scene-2', 5, '文件落在手机「下载 / LocalSend」目录，通知栏直接点开就能预览——提交作业前最后过目一遍就用这步。',
   NULL, NULL, NULL, 'pending'),

  -- S3 大文件传输
  ('scene-3', 1, '电脑端把大文件上传到网盘。建议先建一个「中转」文件夹专门放这类文件，传完好清理。',
   NULL, NULL,
   '单个文件超过网盘免费上限（常见 4GB）传不上去——先用压缩工具「分卷压缩」切成几段，到手机端再解压合并。',
   'pending'),
  ('scene-3', 2, '等上传进度走到 100% 再干别的——中途电脑休眠或关机，传一半的文件等于没传。',
   NULL, NULL, NULL, 'pending'),
  ('scene-3', 3, '手机安装同一个网盘 App，登录同一账号。',
   NULL, NULL, NULL, 'pending'),
  ('scene-3', 4, '在 App 的「中转」文件夹里找到文件，下载到手机本地（别只在云端预览，预览≠保存）。',
   NULL, NULL, NULL, 'pending'),
  ('scene-3', 5, '核对：对比手机显示的文件大小和电脑端是否一致，一致才删掉云端中转文件——不一致重传，别赌。',
   NULL, NULL, NULL, 'pending'),

  -- S4 资料两端同步
  ('scene-4', 1, '电脑安装同步盘客户端并登录，记牢同步文件夹的位置——之后放进这个文件夹的一切都会自动上传。',
   NULL, NULL, NULL, 'pending'),
  ('scene-4', 2, '把代码、笔记等资料移进同步文件夹。注意是移动进去，不是留个快捷方式——快捷方式不会被同步。',
   NULL, NULL, NULL, 'pending'),
  ('scene-4', 3, '手机安装对应的 App 并登录同一账号，测试：电脑端放一个文件进去，看手机端能不能刷出来。',
   NULL, NULL, NULL, 'pending'),
  ('scene-4', 4, '日常用法：电脑改完文件 → 等客户端图标显示「已同步」→ 手机端下拉刷新即是最新版。写报告到一半去图书馆，手机上接着看就是这么来的。',
   NULL, NULL, NULL, 'pending'),
  ('scene-4', 5, '手机上查看或编辑后，务必保存回 App 的同步目录——存到手机相册或其他目录的改动，电脑端收不到。',
   NULL, NULL,
   '同步盘不是备份——电脑上误删会同步删掉，重要资料每周手动另存一份到别的盘；两端同时改同一文件会产生「冲突副本」，以修改时间新的为准。',
   'pending');


-- ------------------------------------------------------------
-- 3. resources  资源入口（6 行）
-- kind 口径：内容提供方。厂商/平台官方 = official，第三方社区内容 = community。
-- 本期 6 条全部是官方站点 -> 全 official，community 为空（字段留作第二期扩展位）。
-- ------------------------------------------------------------
INSERT INTO resources (name, url, purpose, kind)
VALUES
  ('Android 官方帮助', 'https://support.google.com/android',
   '手机系统设置、USB 传输模式的官方说明，S1 第 1 步卡住先查这里', 'official'),
  ('Microsoft Windows 支持', 'https://support.microsoft.com/zh-cn/windows',
   '「此电脑」「文件资源管理器」和驱动问题的官方文档', 'official'),
  ('LocalSend 官网', 'https://localsend.org',
   'S2 用的局域网传输工具，开源免费、无广告', 'official'),
  ('百度网盘官网', 'https://pan.baidu.com',
   'S3 大文件中转用的网盘，客户端下载入口', 'official'),
  ('OneDrive 帮助', 'https://support.microsoft.com/zh-cn/onedrive',
   'S4 同步盘的官方设置指南（Windows 自带，登录即用）', 'official'),
  ('坚果云帮助中心', 'https://help.jianguoyun.com',
   '国内同步盘官方文档，对网速敏感时的 OneDrive 替代', 'official');


-- ------------------------------------------------------------
-- 4. instruments  仪器操作条目（34 行 / 6 台仪器）
-- keywords 与 step_list 是 PG 原生数组 text[]
-- device_type 枚举分布：dc_power 5 / multimeter 7 / oscilloscope 8 /
--                        signal_gen 5 / lcr 3 / curve_tracer 6  = 34
-- ------------------------------------------------------------
INSERT INTO instruments (device_name, title, keywords, step_list, source, device_type)
VALUES
  -- 直流稳压电源 GPS-2303C（5 条）
  ('直流电源 GPS-2303C', '基本使用：开机→设电压→输出',
   ARRAY['电源', '开机', '输出', '设电压', '调压'],
   ARRAY['按 POWER 开机；确认 TRACKING 两个按键都弹起（独立模式）',
         '调 VOLTAGE 旋钮设输出电压，调 CURRENT 旋钮设限流值',
         '接负载：红表笔接输出正极、黑接负极（先关输出再接线更安全）',
         '按输出开关，输出指示灯亮即开始供电'],
   '说明书 P12-13、P20', 'dc_power'),

  ('直流电源 GPS-2303C', '限流点（过流保护）设定',
   ARRAY['限流', '保护', '过流', '短路'],
   ARRAY['确定被测电路允许的最大安全电流',
         '用导线暂时短接输出端正负极',
         '从零旋转 VOLTAGE 直到 C.C. 红灯亮',
         '电表选到 A 档，调 CURRENT 到所需限流值',
         '拆除短路线，恢复正常恒压使用'],
   '说明书 P18', 'dc_power'),

  ('直流电源 GPS-2303C', '看懂 C.V. / C.C. 指示灯',
   ARRAY['指示灯', '恒压', '恒流', 'cv', 'cc'],
   ARRAY['C.V. 绿灯亮＝恒压源状态（正常供电）',
         'C.C. 红灯亮＝进入恒流状态，多半是负载过重或短路',
         '红灯亮时检查负载，或重设限流点'],
   '说明书 P13、P19', 'dc_power'),

  ('直流电源 GPS-2303C', '串联追踪：得到 2 倍电压或正负电源',
   ARRAY['串联', '双倍', '正负', '追踪'],
   ARRAY['按下左边 TRACKING 键（右键弹起）进入串联模式',
         'CH2 电流旋钮顺时针到底；限流只由 CH1 决定',
         '只用 CH1 电压旋钮调压；实际输出电压 = CH1 表头读数 ×2',
         '要正负电源：CH2 负端作公共地，CH1 正端出 +V，CH2 负端出 −V'],
   '说明书 P21-23', 'dc_power'),

  ('直流电源 GPS-2303C', '并联追踪：得到 2 倍电流',
   ARRAY['并联', '大电流', '双倍'],
   ARRAY['TRACKING 两个键同时按下进入并联模式',
         '全部由 CH1 的电压/电流旋钮控制',
         'CH1 电流表读数 ×2 = 实际输出电流'],
   '说明书 P24', 'dc_power'),

  -- 数字万用表 GDM-8341（7 条）
  ('万用表 GDM-8341', '测直流/交流电压',
   ARRAY['电压', '测压', 'dcv', 'acv', '电压档'],
   ARRAY['黑表笔插 COM，红表笔插 VΩ 端口',
         '按 DCV（直流）或 ACV（交流）键；AC+DC 同时按两键',
         '表笔并联接到被测两点，屏显读数',
         '量程：AUTO 自动，或 Up/Down 手动（不知道选最大）'],
   '操作手册 P35', 'multimeter'),

  ('万用表 GDM-8341', '测电流',
   ARRAY['电流', '测流', '电流档'],
   ARRAY['被测电流 <0.5A：红表笔插 0.5A 端口；最大 12A：插 10A 端口；黑表笔插 COM',
         '按 SHIFT→DCV 测直流电流、SHIFT→ACV 测交流电流',
         '万用表串联进被测电路（电流要从表里流过）',
         '选量程后读数；换端口后需重设输入'],
   '操作手册 P39-41', 'multimeter'),

  ('万用表 GDM-8341', '测电阻',
   ARRAY['电阻', '阻值', '欧姆'],
   ARRAY['按 Ω 键进入电阻测量（按两次是通断）',
         '表笔接 VΩ 和 COM，直接并联在被测电阻两端',
         '断电测！带电测电阻读数无效且可能损坏表',
         '量程 500Ω~50MΩ；AUTO 自动或手动 Up/Down'],
   '操作手册 P43-44', 'multimeter'),

  ('万用表 GDM-8341', '通断测试（查线路/焊点）',
   ARRAY['通断', '短路检查', '蜂鸣', '断线'],
   ARRAY['按两次 Ω 键进入连续性测试',
         '表笔接 VΩ 和 COM，碰触被测线路两端',
         '导通时表发出蜂鸣并显示近似阻值——断电测'],
   '操作手册 P48', 'multimeter'),

  ('万用表 GDM-8341', '测二极管',
   ARRAY['二极管', '正向压降', '好坏'],
   ARRAY['按 二极管/电容 键一次，进入二极管测试（约 0.83mA 正向电流）',
         '红笔接二极管正极、黑笔接 COM（负极）',
         '硅管正向压降约 0.5~0.7V，反接显示超量程——两个方向都测'],
   '操作手册 P45', 'multimeter'),

  ('万用表 GDM-8341', '测电容',
   ARRAY['电容', '容值'],
   ARRAY['按 二极管/电容 键两次，进入电容测量（5nF~50μF）',
         '电容先放电！再接 VΩ（+）和 COM（−）',
         '等读数稳定；电容档不支持刷新率/外部触发设置'],
   '操作手册 P46-47', 'multimeter'),

  ('万用表 GDM-8341', '测频率/周期',
   ARRAY['频率', '周期', 'hz'],
   ARRAY['按 Hz 键进入频率/周期测量',
         '信号接 VΩ 和 COM（注意电压范围设置）',
         '频率和周期可用第二显示同时看'],
   '操作手册 P51', 'multimeter'),

  -- 数字示波器 GDS-1102B（8 条）
  ('示波器 GDS-1102B', '首次使用：探头补偿校准',
   ARRAY['探头', '补偿', '首次', '校准', '方波'],
   ARRAY['开机后按 Default 恢复出厂设置',
         '探棒接 CH1，尖端勾住面板 CAL 补偿输出（2Vpp、1kHz 方波），衰减打到 x10',
         '按 Autoset，屏幕应显示干净方波',
         '用螺丝刀旋探棒可调电容，把方波边沿调到平顶不过冲——补偿完成'],
   '操作手册 P27-28', 'oscilloscope'),

  ('示波器 GDS-1102B', 'Auto Set 一键看波形',
   ARRAY['autoset', '自动设置', '看波形', '一键'],
   ARRAY['信号接好后按 Autoset：自动调水平刻度、垂直刻度、触发源',
         '波形居中显示；底部菜单可 Undo Autoset 撤销',
         '两种模式：Fit Screen（含直流成分）/ AC Priority（隔直）',
         '注意：信号 <20Hz 或 <10mV 时 Autoset 抓不住，需手动调'],
   '操作手册 P37-38', 'oscilloscope'),

  ('示波器 GDS-1102B', '冻结波形 / 单次捕获',
   ARRAY['冻结', '暂停', '单次', 'run', 'stop'],
   ARRAY['按 Run/Stop：灯变红＝冻结波形便于读数；再按恢复',
         '抓单次信号（如上电瞬态）：按 Single 键，触发到来后自动停止捕获',
         'Stop 图标出现在屏幕最上方说明处于停止模式'],
   '操作手册 P39', 'oscilloscope'),

  ('示波器 GDS-1102B', '自动测量 Vpp / 频率等',
   ARRAY['测量', '峰峰值', 'vpp', '频率', '读数'],
   ARRAY['按 Measure 键 → 底部菜单选 Add Measurement',
         '右侧菜单选类型：V/I（Pk-Pk、Max、Min…）或 Time（频率、周期、上升时间…）',
         '选定后数值实时显示在屏幕下方',
         'Measure → Display All 可一次显示全部电压+时间测量项'],
   '操作手册 P43-46', 'oscilloscope'),

  ('示波器 GDS-1102B', '光标测量（手动精确读差值）',
   ARRAY['光标', '手动测量', '差值'],
   ARRAY['按 Cursor 键选水平（电压）或垂直（时间）光标',
         '旋旋钮移动两条光标到波形上关心的两个位置',
         '屏幕直接读出 ΔV（电压差）或 Δt（时间差）'],
   '操作手册 P55', 'oscilloscope'),

  ('示波器 GDS-1102B', '调水平/垂直与位置归零',
   ARRAY['刻度', '位置', '缩放', '格'],
   ARRAY['垂直：每通道 SCALE 调电压档位（V/格）、POSITION 上下移动',
         '水平：SCALE 调时间档位（s/格）、POSITION 左右移动',
         '按下水平 POSITION 旋钮（PUSH TO ZERO）一键把位置归零'],
   '操作手册 P40、P95、P102', 'oscilloscope'),

  ('示波器 GDS-1102B', '保存波形 / 截图',
   ARRAY['保存', '截图', '导出', 'u盘'],
   ARRAY['U 盘插前面板 USB Host 口',
         '按 Save/Recall 键保存波形数据或图像（CSV/图片）',
         '或按 Hardcopy 键一键把屏幕截图存到 U 盘（报告里常用）'],
   '操作手册 P197、P228', 'oscilloscope'),

  ('示波器 GDS-1102B', '触发不稳？调 LEVEL 和耦合',
   ARRAY['触发', '不稳', '跳动', '耦合', 'dc', 'ac'],
   ARRAY['波形乱跳：旋 LEVEL 把触发电平调到信号幅值范围内',
         '通道菜单选耦合：DC（看直流成分）或 AC（隔直看纹波）',
         '还不稳按 Default 复位后重新 Autoset'],
   '操作手册 P24、P30', 'oscilloscope'),

  -- 任意波形信号发生器 AFG-2225（5 条）
  ('信号发生器 AFG-2225', '输出正弦波（最常用流程）',
   ARRAY['正弦波', '输出', '波形', 'sine'],
   ARRAY['按 Waveform 波形键选 Sine（正弦）',
         '按 FREQ/Rate 设频率：数字键盘或旋钮输入，F1~F5 选单位（Hz/kHz/MHz）',
         '按 AMPL 设幅值：输入数值后选单位 Vpp / Vrms / dBm',
         '按 Output 键，屏幕显示 Output on 即开始输出',
         'BNC 输出线接到电路输入端'],
   '使用手册 P26-27、P53', 'signal_gen'),

  ('信号发生器 AFG-2225', '设置 DC 偏移',
   ARRAY['偏移', '直流偏置', 'offset'],
   ARRAY['按 Offset 键（或在 AMPL 菜单里选 Offset）',
         '输入偏移量并确认单位（如 +1.0Vdc）',
         '输出 = 交流波形叠加在这个直流偏移上；注意幅值+偏移不要超出 ±10V 限制'],
   '使用手册 P61', 'signal_gen'),

  ('信号发生器 AFG-2225', '输出方波并设占空比/脉宽',
   ARRAY['方波', '脉冲', '占空比', '脉宽'],
   ARRAY['按波形键选 Square（方波）',
         '按 FREQ/Rate 设频率、AMPL 设幅值',
         '在方波菜单里设 Pulse Width（脉宽）或占空比',
         '按 Output 键使能输出'],
   '使用手册 P54-55', 'signal_gen'),

  ('信号发生器 AFG-2225', '扫频（Sweep）输出',
   ARRAY['扫频', '扫描', 'sweep', '频率扫描'],
   ARRAY['按 Mod/Sweep 键进入 Sweep 菜单并使能',
         '设 Start/Stop（或 Center/Span）频率，如 100Hz→1kHz',
         '设 Sweep Time（扫描时间）与类型（线性/对数）',
         'Output 开启后输出频率自动来回扫'],
   '使用手册 P33、P105-110', 'signal_gen'),

  ('信号发生器 AFG-2225', '双通道耦合与同步',
   ARRAY['双通道', '耦合', '同步', '相位'],
   ARRAY['Utility 菜单 → 频率耦合：CH2 频率跟随 CH1 按比例变化',
         '幅值耦合：同理联动幅值',
         '同步：两通道输出相位对齐，用于需要固定相位差的场合'],
   '使用手册 P133-136', 'signal_gen'),

  -- LCR 测试仪 LCR-6002（3 条）
  ('LCR测试仪 LCR-6002', '测电容/电感/电阻基本流程',
   ARRAY['电容', '电感', '测容', 'lcr', '基本流程'],
   ARRAY['开机，在 MEAS DISPLAY 页设条件：FUNC（如 Cs-D）、FREQ（如 1kHz）、LEVEL（如 1V）',
         '连接测试夹具',
         '校准（见下一条，第一次必做）',
         '把元件插上夹具，按 Measure 键（内部触发连续测量），主副参数同时显示'],
   '使用手册 P84-91', 'lcr'),

  ('LCR测试仪 LCR-6002', '开路/短路校准（去夹具误差，必做）',
   ARRAY['校准', '开路', '短路', '补偿', '误差'],
   ARRAY['按 Measure 键和 OPEN SHORT 软键',
         'OPEN TEST：夹具空置不接任何东西 → 按 MEAS OPEN + OK，等 ''Correction finished''',
         'SHORT TEST：夹具间接短路线 → 按 MEAS SHORT + OK',
         '两项都设 ON；换测试频率/线长后建议重校'],
   '使用手册 P38-40、P90-91', 'lcr'),

  ('LCR测试仪 LCR-6002', '选测量功能与等效电路',
   ARRAY['等效', '串联', '并联', 'cs', 'ls', '功能'],
   ARRAY['FUNC 软键选主副参数组合：Cs-D（电容+损耗）、Ls-Q（电感+品质因数）、Rs 等',
         '小容量电容用并联等效（Cp）、大容量用串联（Cs）是经验起点',
         'AUTO 量程默认开启，也可手动锁量程'],
   '使用手册 P30、P100', 'lcr'),

  -- 晶体管特性图示仪 WQ4830（6 条）
  ('晶体管图示仪 WQ4830', '测试前必读：安全操作顺序',
   ARRAY['安全', '准备', '测试前', '预热', '放电'],
   ARRAY['开机预热 20 分钟以上再测量（保证精度）',
         '测试前先把『扫描电源%』旋钮逆时针旋到 0，再设参数、插器件',
         '徐徐加大扫描电压，防止冲击器件；测完先回 0 再取器件',
         '测反向漏电流（IR）后电容存电：等约 10 秒再碰器件',
         '功耗电阻选原则：电流小选大电阻、电流大选小电阻；测耐压选 ≥1kΩ'],
   '使用说明书 P3-4', 'curve_tracer'),

  ('晶体管图示仪 WQ4830', '测 NPN 三极管输出特性与 β',
   ARRAY['三极管', 'npn', 'beta', '放大倍数', '输出特性'],
   ARRAY['电源极性 NPN(正)，阶梯极性自动跟随',
         '设功耗电阻、扫描电源档、水平电压/格、垂直电流/格',
         '阶梯：电流/级（如 2.0mA/级）、级数 10 级、模式''电流正常''',
         '插器件（C/E/B 对应测试座），徐徐加压得输出特性曲线族',
         '屏幕直接显示 β（=ΔIC/ΔIB）；直流 hFE 用法：级数设 1 级'],
   '使用说明书 P27（E13005 实例）', 'curve_tracer'),

  ('晶体管图示仪 WQ4830', '测 PNP 三极管',
   ARRAY['pnp', '三极管'],
   ARRAY['与 NPN 相同流程，仅阶梯极性设为 PNP(负)（电源极性切换时通常自动跟随）',
         '阶梯电流档按管子功率选（小功率 20μA/级 级别起步）'],
   '使用说明书 P29（2S8550 实例）', 'curve_tracer'),

  ('晶体管图示仪 WQ4830', '测二极管正向特性 / 稳压管稳压值',
   ARRAY['二极管', '稳压', '正向'],
   ARRAY['阶梯级数设 0（二极管不需要阶梯）',
         '设水平电压/格、垂直电流/格与功耗电阻',
         '器件接 C、E 测试座，徐徐加压得正向特性曲线',
         '稳压管：反向加压找拐点，配合电压筛选功能在指定电流下读稳压值'],
   '使用说明书 P33-34', 'curve_tracer'),

  ('晶体管图示仪 WQ4830', '测反向漏电流 IR / 击穿电压',
   ARRAY['漏电流', '击穿', '反向', '耐压'],
   ARRAY['器件接 C 与 IR 端（二极管负极接 IR 侧）',
         '开 IR 滤波、关电压/电流滤波（不然读数偏大）',
         '高压测试（≥500V）选大功耗电阻、垂直档 <1mA/格，勿碰器件',
         '测试结束等约 10 秒放电再取器件'],
   '使用说明书 P4、P25、P42', 'curve_tracer'),

  ('晶体管图示仪 WQ4830', '测 MOSFET 开启电压',
   ARRAY['mos', '场效应', '开启电压', '阈值'],
   ARRAY['阶梯电压模式，1V/级、级数 2',
         '徐徐调『阶梯偏置』，出现第一条曲线时的偏置值即开启电压 Vth',
         'gm（跨导）测量方法与 β 类似'],
   '使用说明书 P46', 'curve_tracer');


-- ------------------------------------------------------------
-- 5. tasks  任务索引（8 行）
-- 8 个跳转按钮 -> 4 个场景
-- keywords：字段建好了，但现无真实数据（前端是推导出来的）-> 一律 NULL
-- ------------------------------------------------------------
INSERT INTO tasks (label, scene_id, keywords)
VALUES
  ('实验数据传电脑', 'scene-1', NULL),
  ('拍板书',         'scene-1', NULL),
  ('交作业',         'scene-2', NULL),
  ('电脑文件传回手机', 'scene-2', NULL),
  ('大文件传输',     'scene-3', NULL),
  ('传安装包',       'scene-3', NULL),
  ('资料两端同步',   'scene-4', NULL),
  ('同步笔记',       'scene-4', NULL);


-- ============================================================
-- 以下为核对用的 SELECT，执行完直接看行数对不对。
-- 预期：scenes 4 / steps 20 / resources 6 / instruments 34 / tasks 8
-- ============================================================

SELECT 1 AS ord, 'scenes' AS table_name, count(*) AS row_count FROM scenes
UNION ALL SELECT 2, 'steps',       count(*) FROM steps
UNION ALL SELECT 3, 'resources',   count(*) FROM resources
UNION ALL SELECT 4, 'instruments', count(*) FROM instruments
UNION ALL SELECT 5, 'tasks',       count(*) FROM tasks
ORDER BY ord;

-- 顺便验证那条关联字段：每个场景各挂了几步（应该全是 5）
SELECT s.no, s.name, count(st.id) AS step_rows
FROM scenes s
LEFT JOIN steps st ON st.scene_id = s.id
GROUP BY s.no, s.name
ORDER BY s.no;
