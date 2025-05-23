/*
 * this project is developed based on ml5.js: https://ml5js.org/
 * ml5.js license and Code of Conduct: https://github.com/ml5js/ml5-next-gen/blob/main/LICENSE.md
 */

let videoStream;
let bodyPoseDetector;
let poses = [];
let connections;
let isDetecting = false;
let toggleButton;
let recordedPoses = [];
let lastRecordTime = 0;
const RECORD_INTERVAL = 333;

// 新增計時相關變數
let startTime = 0;
let showingTitle = true;
let showingIntro = false;
let showingPrompt = false;
let isCountingDown = false;
const INTRO_DURATION = 5000; // 介紹文字顯示5秒
const PROMPT_DURATION = 5000; // 提示文字顯示5秒
const FADE_DURATION = 1000; // 淡入淡出時間1秒
const TEXT_MOVE_DELAY = 3000; // 文字移動延遲時間
const TEXT_MOVE_DURATION = 1000; // 文字移動時間
let textOpacity = 0; // 文字透明度
let promptY = 0; // 文字Y軸位置
const PROMPT_CENTER_Y = 540; // 中央位置
const PROMPT_TOP_Y = 120; // 最終位置
const COUNTDOWN_DURATION = 3000; // 倒數3秒
const RECORDING_DURATION = 5000; // 錄製5秒
const REPLAY_DURATION = 10000; // 重播持續10秒
let isReplaying = false;
let isShowingResult = false;
let replayStartTime = 0;
let resultDisplayStartTime = 0; // 新增：用於追蹤結果顯示時間

// 新增動態文字變數
let titleText;
let subtitleText;

// 新增 Y-pose 偵測相關變數
let yPoseStartTime = 0;
let isHoldingYPose = false;
let isYPoseLocked = false; // 新增鎖定變數
const YPOSE_HOLD_DURATION = 3000; // 需要保持 Y-pose 3秒

// 新增字體變數
let myFont;
let myFontBold;
let pilowlavaFont;

// 新增 reset 按鈕變數
let resetButton;

// 新增等待開始錄製的狀態
let waitingToStart = false;

// 新增下載按鈕變數
let downloadButton;

// 新增顏色相關變數
let currentHue;

// 新增情緒表達列表
const emotions = [
  "I'm so happy",
  "I love you",
  "I'm so frustrated",
  "I'm feeling sorrow",
  "I'm so excited"
];

// 新增當前情緒變數
let currentEmotion;

// 新增情緒路徑
const emotionPaths = {
  1: 'assets/SkeletonData/0',
  2: 'assets/SkeletonData/1',
  3: 'assets/SkeletonData/2',
  4: 'assets/SkeletonData/3',
  5: 'assets/SkeletonData/4',
};

// 新增背景動畫變數
let backgroundPoints;

// 新增 result display 變數
let resultDisplay;

// 新增國籍選擇相關變數
let showingAge = false;
let ageGroups = [
  "0-10",
  "11-20",
  "21-30",
  "31-40",
  "41-50",
  "51-60",
  "61-70",
  "70+"
];
let selectedAge = null;
let ageSelectionStartTime = 0;
const AGE_SELECTION_DURATION = 2000; // 需要保持選擇2秒
let isSelectingAge = false;

let showingNationality = false;
let nationalities = [
  "East\nAsia",
  "South &\nSoutheast\nAsia",
  "Africa",
  "Europe",
  "Middle\nEast &\nCentral\nAsia",
  "North\nAmerica",
  "South\nAmerica",
  "Oceania"
];
let selectedNationality = null;
let nationalitySelectionStartTime = 0;
const NATIONALITY_SELECTION_DURATION = 2000; // 需要保持選擇2秒
let isSelectingNationality = false;

let menuHoverStartTime = null;
let menuItemHoverStartTime = null;

// 新增滑動條相關變數
let selectedAgeFilter = 0;
let selectedNationalityFilter = 0;
let ageSliderValue = 0;
let nationalitySliderValue = 0;
let isDraggingAgeSlider = false;
let isDraggingNationalitySlider = false;

// 新增過濾器陣列
const ageFilters = ["All", ...ageGroups];
const nationalityFilters = ["All", ...nationalities];

// 在全局變數區域添加新的變數
let smoothedRightWristX = 0;
let smoothedRightWristY = 0;
let smoothedLeftWristX = 0;
let smoothedLeftWristY = 0;
const SMOOTHING_FACTOR = 0.2; // 平滑因子，值越小移動越平滑

// 1. 定義 hover 狀態與計時
let ageLeftHoverTime = null, ageRightHoverTime = null;
let natLeftHoverTime = null, natRightHoverTime = null;
const HOVER_DELAY = 500; // ms

function preload() {
  // Load the bodyPose model
  bodyPoseDetector = ml5.bodyPose('BlazePose', { flipped: true });
  
  // fonts
  myFont = loadFont('assets/font/Favorit-Inter.otf');
  myFontBold = loadFont('assets/font/Favorit-Bold.otf');
  pilowlavaFont = loadFont('assets/font/Pilowlava-Atome.otf');

  //UI
  gradient = loadImage('assets/UI/MoTrack-UI.png');
  gradientBottom = loadImage('assets/UI/MoTrack-Gradient.png');
  yposeUI = loadImage('assets/UI/MoTrack-YPOSE2.png');
}

function setup() {
  createCanvas(1080, 1920);
  background(0);
  colorMode(RGB, 255, 255, 255, 255);
  // 產生隨機色相
  currentHue = random(360);

  // 隨機選擇一個情緒
  currentEmotion = emotions[Math.floor(Math.random() * emotions.length)];

  // 初始化背景動畫
  backgroundPoints = new ConnectionPoints(10);

  // 創建動態文字
  titleText = new DynamicText('TRACING THE UNSPOKEN', width/2, height/2 - 100, 72);
  subtitleText = new DynamicText('Please stand in front of the camera', width/2, height/2 + 50, 32);

  // 創建攝影機串流
  try {
    videoStream = createCapture(VIDEO, { 
      flipped: true,
      audio: false,
      video: {
        width: { ideal: 1080 },
        height: { ideal: 1920 },
      }
    });
    
    videoStream.hide();

    // 創建 reset 按鈕（一開始隱藏）
    resetButton = createButton('RESET');
    resetButton.position(width/2 - 50, height - 60);
    resetButton.size(100, 40);
    resetButton.style('font-size', '16px');
    resetButton.style('background-color', '#ffffff');
    resetButton.style('border', 'none');
    resetButton.style('border-radius', '20px');
    resetButton.style('cursor', 'pointer');
    resetButton.style('z-index', '1');
    resetButton.style('position', 'fixed');
    resetButton.mousePressed(resetAll);
    resetButton.hide();

    // 創建 download 按鈕（一開始隱藏）
    downloadButton = createButton('DOWNLOAD');
    downloadButton.position(width/2 + 60, height - 60);
    downloadButton.size(150, 40);
    downloadButton.style('font-size', '16px');
    downloadButton.style('background-color', '#ffffff');
    downloadButton.style('border', 'none');
    downloadButton.style('border-radius', '20px');
    downloadButton.style('cursor', 'pointer');
    downloadButton.style('z-index', '1');
    downloadButton.style('position', 'fixed');
    downloadButton.mousePressed(downloadRecording);
    downloadButton.hide();

    connections = bodyPoseDetector.getConnections();
    
    // 設定開始時間
    startTime = millis();
  } catch (error) {
    console.error('Error accessing camera:', error);
  }

  // 開始檢測骨架
  bodyPoseDetector.detectStart(videoStream, gotPoses);

  // 初始化 result display
  resultDisplay = new ResultDisplay();
  resultDisplay.setup();
  
  // 設定重置和下載事件處理器
  window.onReset = resetAll;
  window.onDownload = downloadRecording;

  // 初始化骨架動畫
  setTimeout(() => {
    initSkeletonAnimations();
  }, 1000); // 延遲1秒初始化，確保所有資源都已載入
}

function draw() {
  background(0);
  
  // 顯示標題畫面階段
  if (showingTitle) {
    // 更新和繪製背景動畫
    backgroundPoints.update();
    backgroundPoints.draw();
    
    // 繪製靜態文字
    textAlign(CENTER, CENTER);
    fill(255);
    
    // 計算文字位置
    let y = height/2;
    
    // 標題文字
    textFont(pilowlavaFont);
    textSize(108);
    text('TRACING\nTHE\nUNSPOKEN', width/2, y - 100);
    
    // 副標題
    textFont(myFont);
    textSize(32);
    text('Please stand in front of the camera', width/2, height - 200);
    
    // 如果偵測到完整骨架，進入 showing 階段
    if (poses.length > 0 && isFullBodyDetected(poses[0])) {
      showingTitle = false;
      showingIntro = true;
      startTime = millis();
    }
    return;
  }
  
  // 顯示提示文字階段
  if (showingIntro) {
    textAlign(LEFT);
    
    // 計算淡入淡出的透明度
    let currentTime = millis() - startTime;
    if (currentTime < FADE_DURATION) {
      // 淡入階段
      textOpacity = map(currentTime, 0, FADE_DURATION, 0, 255);
    } else if (currentTime > INTRO_DURATION - FADE_DURATION) {
      // 淡出階段
      textOpacity = map(currentTime, INTRO_DURATION - FADE_DURATION, INTRO_DURATION, 255, 0);
    } else {
      // 完全顯示階段
      textOpacity = 255;
    }
    
    // 設置文字顏色和透明度
    fill(255, textOpacity);
    
    // 計算文字位置
    let y = height/2;
    
    // 顯示介紹文字
    textFont(myFont);
    textSize(72);
    text('Can you speak\nwithout words?', 100, y-100);

    textSize(48);
    text('Use your body to express emotions,\nand see how movement becomes\nits own kind of language.', 100, y+140);
    
    if (millis() - startTime > INTRO_DURATION) {
      showingIntro = false;
      showingAge = true;
      startTime = millis();
    }
    return;
  }

  // 顯示年齡選擇階段
  if (showingAge) {
    // 水平翻轉攝影機畫面
    push();
    translate(width, 0);
    scale(-1, 1);
    image(videoStream, 0, 0, width, height);
    image(gradient, 0, 0, width, height);
    image(gradientBottom, 0, 0, width, height);
    pop();
    
    // 顯示標題
    push();
    textAlign(CENTER, CENTER);
    textFont(myFont);
    textSize(72);
    noStroke();
    fill(255);
    text('Select your age group', width/2, 200);

    textSize(32);
    fill(255);
    text('Move your hand to select your age group', width/2, height - 200);
    pop();
    
    // 計算圓形選項的位置
    let circleRadius = 100;
    let circleSpacing = 30;
    let totalWidth = (circleRadius * 2 * 4) + (circleSpacing * 3);
    let startX = (width - totalWidth) / 2 + circleRadius;
    let startY = height/2;
    
    // 第一排四個選項
    for (let i = 0; i < 4; i++) {
      let x = startX + i * (circleRadius * 2 + circleSpacing);
      let y = startY - circleRadius - circleSpacing/2;
      let isSelected = selectedAge === i;
      
      // 繪製圓形背景
      noStroke();
      if (isSelected) {
        fill(255, 100);
      } else {
        fill(255, 70);
      }
      circle(x, y, circleRadius * 2);
      
      // 繪製選項文字
      fill(255);
      textSize(32);
      textAlign(CENTER, CENTER);
      text(ageGroups[i], x, y);
      
      // 如果正在選擇，顯示進度條
      if (isSelectingAge && isSelected) {
        let progress = (millis() - ageSelectionStartTime) / AGE_SELECTION_DURATION;
        progress = constrain(progress, 0, 1);
        
        noFill();
        stroke(255, 50);
        strokeWeight(5);
        circle(x, y, circleRadius * 2);
        
        stroke(255);
        strokeWeight(5);
        arc(x, y, circleRadius * 2, circleRadius * 2, -HALF_PI, -HALF_PI + TWO_PI * progress);
      }
    }
    
    // 第二排四個選項
    for (let i = 4; i < 8; i++) {
      let x = startX + (i - 4) * (circleRadius * 2 + circleSpacing);
      let y = startY + circleRadius + circleSpacing/2;
      let isSelected = selectedAge === i;
      
      // 繪製圓形背景
      noStroke();
      if (isSelected) {
        fill(255, 100);
      } else {
        fill(255, 70);
      }
      circle(x, y, circleRadius * 2);
      
      // 繪製選項文字
      fill(255);
      textSize(32);
      textAlign(CENTER, CENTER);
      text(ageGroups[i], x, y);
      
      // 如果正在選擇，顯示進度條
      if (isSelectingAge && isSelected) {
        let progress = (millis() - ageSelectionStartTime) / AGE_SELECTION_DURATION;
        progress = constrain(progress, 0, 1);
        
        noFill();
        stroke(255, 50);
        strokeWeight(5);
        circle(x, y, circleRadius * 2);
        
        stroke(255);
        strokeWeight(5);
        arc(x, y, circleRadius * 2, circleRadius * 2, -HALF_PI, -HALF_PI + TWO_PI * progress);
      }
    }
    
    return;
  }

  // 顯示國籍選擇階段
  if (showingNationality) {
    // 水平翻轉攝影機畫面
    push();
    translate(width, 0);
    scale(-1, 1);
    image(videoStream, 0, 0, width, height);
    image(gradient, 0, 0, width, height);
    image(gradientBottom, 0, 0, width, height);
    pop();
    
    // 顯示標題
    push();
    textAlign(CENTER, CENTER);
    textFont(myFont);
    textSize(72);
    noStroke();
    fill(255);
    text('Select your nationality', width/2, 200);

    textSize(32);
    fill(255);
    text('Move your hand to select your nationality', width/2, height - 200);
    pop();
    
    // 計算圓形選項的位置
    let circleRadius = 100;
    let circleSpacing = 30;
    let totalWidth = (circleRadius * 2 * 4) + (circleSpacing * 3);
    let startX = (width - totalWidth) / 2 + circleRadius;
    let startY = height/2;
    
    // 第一排四個選項
    for (let i = 0; i < 4; i++) {
      let x = startX + i * (circleRadius * 2 + circleSpacing);
      let y = startY - circleRadius - circleSpacing/2;
      let isSelected = selectedNationality === i;
      
      // 繪製圓形背景
      noStroke();
      if (isSelected) {
        fill(255, 100);
      } else {
        fill(255, 70);
      }
      circle(x, y, circleRadius * 2);
      
      // 繪製選項文字
      fill(255);
      textSize(32);
      textAlign(CENTER, CENTER);
      text(nationalities[i], x, y);
      
      // 如果正在選擇，顯示進度條
      if (isSelectingNationality && isSelected) {
        let progress = (millis() - nationalitySelectionStartTime) / NATIONALITY_SELECTION_DURATION;
        progress = constrain(progress, 0, 1);
        
        // 繪製圓形進度條
        noFill();
        stroke(255, 50);
        strokeWeight(5);
        circle(x, y, circleRadius * 2);
        
        stroke(255);
        strokeWeight(5);
        arc(x, y, circleRadius * 2, circleRadius * 2, -HALF_PI, -HALF_PI + TWO_PI * progress);
      }
    }
    
    // 第二排四個選項
    for (let i = 4; i < 8; i++) {
      let x = startX + (i - 4) * (circleRadius * 2 + circleSpacing);
      let y = startY + circleRadius + circleSpacing/2;
      let isSelected = selectedNationality === i;
      
      // 繪製圓形背景
      noStroke();
      if (isSelected) {
        fill(255, 100);
      } else {
        fill(255, 70);
      }
      circle(x, y, circleRadius * 2);
      
      // 繪製選項文字
      fill(255);
      textSize(32);
      textAlign(CENTER, CENTER);
      text(nationalities[i], x, y);
      
      // 如果正在選擇，顯示進度條
      if (isSelectingNationality && isSelected) {
        let progress = (millis() - nationalitySelectionStartTime) / NATIONALITY_SELECTION_DURATION;
        progress = constrain(progress, 0, 1);
        
        // 繪製圓形進度條
        noFill();
        stroke(255, 50);
        strokeWeight(5);
        circle(x, y, circleRadius * 2);
        
        stroke(255);
        strokeWeight(5);
        arc(x, y, circleRadius * 2, circleRadius * 2, -HALF_PI, -HALF_PI + TWO_PI * progress);
      }
    }
    
    return;
  }

  // 等待開始錄製階段
  if (waitingToStart) {
    // 水平翻轉攝影機畫面
    push();
    translate(width, 0);
    scale(-1, 1);
    image(videoStream, 0, 0, width, height);
    image(gradient, 0, 0, width, height);
    image(yposeUI, 0, 0, width, height);
    pop();
    
    textAlign(CENTER, CENTER);
    fill(255);
    
    // prompt
    // 計算文字位置
    let currentTime = millis() - startTime;
    
    // if (currentTime < TEXT_MOVE_DELAY) {
    //   // 前3秒保持在中央
    //   promptY = height/2;
    // } else if (currentTime < TEXT_MOVE_DELAY + TEXT_MOVE_DURATION) {
    //   // 在1秒內移動到頂部
    //   let moveProgress = (currentTime - TEXT_MOVE_DELAY) / TEXT_MOVE_DURATION;
    //   promptY = lerp(height/2, 180, moveProgress);
    // } else {
    //   // 保持在頂部
    //   promptY = 180;
    // }
    
    // "How do you express" 使用 Inter
    textFont(myFont);
    textSize(64);
    text('How do you express', width/2, 140);
    
    // 當前選擇的情緒 使用 Medium
    textFont(myFontBold);
    textSize(64);
    text(`"${currentEmotion}"`, width/2, 220);
    
    // "with your body?" 使用 Inter
    textFont(myFont);
    textSize(64);
    text('with your body?', width/2, 300);
    
    if (millis() - startTime > PROMPT_DURATION) {
      showingPrompt = false;
      waitingToStart = true;
      startTime = millis();
    }

    // 顯示骨架
    if (poses.length > 0) {
      // 繪製骨架連接線
      // for (let connection of connections) {
      //   let pointA = poses[0].keypoints[connection[0]];
      //   let pointB = poses[0].keypoints[connection[1]];
      //   if (pointA.confidence > 0.1 && pointB.confidence > 0.1) {
      //     stroke(255, 0, 0); // 黃色線條
      //     strokeWeight(3);
      //     line(pointA.x, pointA.y, pointB.x, pointB.y);
      //   }
      // }
      
      // // 繪製關鍵點和標籤
      // for (let keypoint of poses[0].keypoints) {
      //   if (keypoint.confidence > 0.1) {
      //     // 繪製點
      //     fill(255, 0, 0); // 紅色點
      //     noStroke();
      //     circle(keypoint.x, keypoint.y, 8);
          
          // // 添加英文標籤
          // fill(255);
          // textSize(50);
          // textAlign(LEFT, CENTER);
          // text(keypoint.name, keypoint.x + 10, keypoint.y);
        }
      // }
    // }
    
    // 顯示提示文字
    textAlign(CENTER, CENTER);
    textFont(myFont);
    textSize(32);
    
    // 計算淡入淡出的透明度
    currentTime = millis() - startTime;
    if (currentTime < FADE_DURATION) {
      // 淡入階段
      textOpacity = map(currentTime, 0, FADE_DURATION, 0, 255);
    } else if (currentTime > PROMPT_DURATION - FADE_DURATION) {
      // 淡出階段
      textOpacity = map(currentTime, PROMPT_DURATION - FADE_DURATION, PROMPT_DURATION, 255, 0);
    } else {
      // 完全顯示階段
      textOpacity = 255;
    }
    
    if (isHoldingYPose) {
      // 計算進度
      let progress = (millis() - yPoseStartTime) / YPOSE_HOLD_DURATION;
      progress = constrain(progress, 0, 1); // 確保進度在0到1之間
      
      // 繪製進度條背景
      let barWidth = 400;
      let barHeight = 20;
      let barX = width/2 - barWidth/2;
      let barY = height - 200;
      
      noStroke();
      fill(255, 50); // 半透明背景
      rect(barX, barY, barWidth, barHeight, 10);
      
      // 繪製進度條
      fill(255, textOpacity);
      rect(barX, barY, barWidth * progress, barHeight, 10);
      
      // 繪製進度文字
      fill(255, textOpacity);
      textSize(24);
      textAlign(CENTER, CENTER);
      text(`${ceil(progress * 100)}%`, width/2, barY + barHeight + 20);
    } else {
      fill(255, textOpacity);
      text('When you\'re ready\nraise your hands to start recording', width/2, height - 200);
    }
    
    if (millis() - startTime > PROMPT_DURATION) {
      showing = false;
      waitingToStart = true;
      startTime = millis();
    }

    // // 顯示骨架
    // if (poses.length > 0) {
    //   // 繪製骨架連接線
    //   for (let connection of connections) {
    //     let pointA = poses[0].keypoints[connection[0]];
    //     let pointB = poses[0].keypoints[connection[1]];
    //     if (pointA.confidence > 0.1 && pointB.confidence > 0.1) {
    //       stroke(255, 0, 0); // 紅色線條
    //       strokeWeight(3);
    //       line(pointA.x, pointA.y, pointB.x, pointB.y);
    //     }
    //   }
      
    //   // 繪製關鍵點和標籤
    //   for (let keypoint of poses[0].keypoints) {
    //     if (keypoint.confidence > 0.1) {
    //       // 繪製點
    //       fill(255, 0, 0); // 紅色點
    //       noStroke();
    //       circle(keypoint.x, keypoint.y, 8);
          
    //       // 添加英文標籤
    //       fill(255);
    //       textSize(50);
    //       textAlign(LEFT, CENTER);
    //       text(keypoint.name, keypoint.x + 10, keypoint.y);
    //     }
    //   }
    // }

    return;
  }

  // 倒數計時階段
  if (isCountingDown) {
    // 水平翻轉攝影機畫面
    push();
    translate(width, 0);
    scale(-1, 1);
    image(videoStream, 0, 0, width, height);
    image(gradient, 0, 0, width, height);
    image(yposeUI, 0, 0, width, height);
    pop();
    
    // 顯示倒數數字
    let timeLeft = ceil((COUNTDOWN_DURATION - (millis() - startTime)) / 1000);
    textSize(128);
    textAlign(CENTER, CENTER);
    fill(255);
    text(timeLeft, width/2, height/2);

    // 顯示情緒提示
    textFont(myFont);
    textSize(64);
    text('How do you express', width/2, 140);
    
    textFont(myFontBold);
    textSize(64);
    text(`"${currentEmotion}"`, width/2, 220);
    
    textFont(myFont);
    textSize(64);
    text('with your body?', width/2, 300);

    if (millis() - startTime > COUNTDOWN_DURATION) {
      isCountingDown = false;
      isDetecting = true;
      bodyPoseDetector.detectStart(videoStream, gotPoses);
      startTime = millis();
    }
    return;
  }

  // 錄製階段
  if (isDetecting) {
    // 水平翻轉攝影機畫面
    push();
    translate(width, 0);
    scale(-1, 1);
    image(videoStream, 0, 0, width, height);
    image(gradient, 0, 0, width, height);
    pop();
    
    // 顯示情緒提示
    textAlign(CENTER, CENTER);
    textFont(myFont);
    textSize(64);
    text('How do you express', width/2, 140);
    
    textFont(myFontBold);
    textSize(64);
    text(`"${currentEmotion}"`, width/2, 220);
    
    textFont(myFont);
    textSize(64);
    text('with your body?', width/2, 300);
    
    // 檢查是否達到錄製時間
    if (millis() - startTime > RECORDING_DURATION) {
      isDetecting = false;
      bodyPoseDetector.detectStop();
      poses = [];
      isReplaying = true;
      replayStartTime = millis();
    }
    
    // 記錄姿勢
    if (poses.length > 0 && millis() - lastRecordTime > RECORD_INTERVAL) {
      let poseWithTimestamp = {
        timestamp: millis() - startTime,
        keypoints: JSON.parse(JSON.stringify(poses[0].keypoints))
      };
      recordedPoses.push(poseWithTimestamp);
      lastRecordTime = millis();
    }

    // 顯示剩餘錄製時間
    let recordingTimeLeft = ceil((RECORDING_DURATION - (millis() - startTime)) / 1000);
    push();
    textSize(64);
    textAlign(CENTER, TOP);
    fill(255);
    text(recordingTimeLeft, width/2, 400);
    pop();

    // 即時骨架 - 使用當前的色相
    if (poses.length > 0) {
      push();
      translate(width, 0);
      scale(-1, 1);
      drawPoseSet(
        poses, 
        color(currentHue, 80, 90), // 主要顏色
        color((currentHue + 120) % 360, 80, 90), // +120度
        color((currentHue + 240) % 360, 80, 90), // +240度
        color((currentHue + 30) % 360, 80, 90), // +30度
        color((currentHue - 30) % 360, 80, 90) // -30度
      );
      pop();
    }
  }

  // 重播階段
  if (isReplaying) {
    // 水平翻轉攝影機畫面
    push();
    translate(width, 0);
    scale(-1, 1);
    pop();
    
    // 顯示情緒提示
    textAlign(CENTER, CENTER);
    textFont(myFont);
    textSize(64);
    text('How do you express', width/2, 140);
    
    textFont(myFontBold);
    textSize(64);
    text(`"${currentEmotion}"`, width/2, 220);
    
    textFont(myFont);
    textSize(64);
    text('with your body?', width/2, 300);

    // 重播錄製的姿勢
    if (recordedPoses.length > 0) {
      let currentTime = millis() - replayStartTime;
      // 計算循環時間
      let totalDuration = recordedPoses[recordedPoses.length - 1].timestamp;
      currentTime = currentTime % totalDuration; // 使用取模運算來實現循環
      
      let currentPose = recordedPoses.find(pose => pose.timestamp >= currentTime) || recordedPoses[recordedPoses.length - 1];
      
      if (currentPose) {
        push();
        translate(width, 0);
        scale(-1, 1);
        drawPoseSet(
          [{ keypoints: currentPose.keypoints }],
          color(currentHue, 80, 90),
          color((currentHue + 120) % 360, 80, 90),
          color((currentHue + 240) % 360, 80, 90),
          color((currentHue + 30) % 360, 80, 90),
          color((currentHue - 30) % 360, 80, 90)
        );
        pop();
      }
    }
    
    // 檢查是否達到重播時間
    if (millis() - replayStartTime > REPLAY_DURATION) {
      isReplaying = false;
      isShowingResult = true;
      bodyPoseDetector.detectStart(videoStream, gotPoses);
      // Automatically download the recording
      downloadRecording();
    }
    return;
  }

  // 在重播階段之後顯示骨架動畫
  if (isShowingResult) {
    // 如果是第一次進入這個階段，記錄開始時間
    if (resultDisplayStartTime === 0) {
      resultDisplayStartTime = millis();
    }

    background(0);
    updateSkeletonAnimations();
    drawSkeletonAnimations();

    fill(0);
    rect(width/4, height/4, width/4*3, height/2);

    // 檢查是否已經顯示超過30秒
    if (millis() - resultDisplayStartTime > 120000) { // 120000毫秒 = 120秒
      resetAll(); // 重置所有狀態
      return;
    }

    if (recordedPoses.length > 0) {
      let currentTime = millis() - replayStartTime;
      let totalDuration = recordedPoses[recordedPoses.length - 1].timestamp;
      currentTime = currentTime % totalDuration;
      let currentPose = recordedPoses.find(pose => pose.timestamp >= currentTime) || recordedPoses[recordedPoses.length - 1];
      if (currentPose) {
        push();
        translate(width/1.3, height/4);
        scale(-0.5, 0.5);
        drawPoseSet(
          [{ keypoints: currentPose.keypoints }],
          color(currentHue, 80, 90),
          color((currentHue + 120) % 360, 80, 90),
          color((currentHue + 240) % 360, 80, 90),
          color((currentHue + 30) % 360, 80, 90),
          color((currentHue - 30) % 360, 80, 90)
        );
        pop();
      }
      //resetButton.show();
    }
    // --- 新filter UI ---
    let cx = width - 150;
    let cy1 = height/2 - 160;
    let cy2 = height/2 + 140;
    let arrowOffset = 80;
    let arrowSize = 20;
    // 取得手掌位置
    let rx = smoothedRightWristX, ry = smoothedRightWristY;
    // 年齡圓形
    let ageLeftHover = dist(rx, ry, cx-arrowOffset, cy1) < 30;
    let ageRightHover = dist(rx, ry, cx+arrowOffset, cy1) < 30;
    // 國籍圓形
    let natLeftHover = dist(rx, ry, cx-arrowOffset, cy2) < 30;
    let natRightHover = dist(rx, ry, cx+arrowOffset, cy2) < 30;
    // 年齡hover計時
    if (ageLeftHover) {
      if (!ageLeftHoverTime) ageLeftHoverTime = millis();
      if (millis() - ageLeftHoverTime > HOVER_DELAY) {
        selectedAgeFilter = (selectedAgeFilter - 1 + ageFilters.length) % ageFilters.length;
        ageLeftHoverTime = millis();
      }
    } else { ageLeftHoverTime = null; }
    if (ageRightHover) {
      if (!ageRightHoverTime) 
        ageRightHoverTime = millis();
      if (millis() - ageRightHoverTime > HOVER_DELAY) {
        selectedAgeFilter = (selectedAgeFilter + 1) % ageFilters.length;
        ageRightHoverTime = millis();
      }
    } else { ageRightHoverTime = null; }
    // 國籍hover計時
    if (natLeftHover) {
      if (!natLeftHoverTime) natLeftHoverTime = millis();
      if (millis() - natLeftHoverTime > HOVER_DELAY) {
        selectedNationalityFilter = (selectedNationalityFilter - 1 + nationalityFilters.length) % nationalityFilters.length;
        natLeftHoverTime = millis();
      }
    } else { natLeftHoverTime = null; }
    if (natRightHover) {
      if (!natRightHoverTime) natRightHoverTime = millis();
      if (millis() - natRightHoverTime > HOVER_DELAY) {
        selectedNationalityFilter = (selectedNationalityFilter + 1) % nationalityFilters.length;
        natRightHoverTime = millis();
      }
    } else { 
      natRightHoverTime = null; 
    }
    // 畫圓形與箭頭
    function drawFilterCircle(x, y, label, value, leftHover, rightHover) {
      fill(0); 
      stroke(255); 
      strokeWeight(2);
      ellipse(x, y, 160, 160);
      noStroke(); 
      fill(255); 
      textAlign(CENTER, CENTER); 
      textSize(24);
      text(value, x, y);
      // 左箭頭
      fill(leftHover ? 'grey' : 255);
      triangle(x-80, y, x-60, y-20, x-60, y+20);
      // 右箭頭
      fill(rightHover ? 'grey' : 255);
      triangle(x+80, y, x+60, y-20, x+60, y+20);
      // 標籤
      fill(255); 
      textSize(24);
      text(label, x, y+100);
    }
    drawFilterCircle(cx, cy1, 'Age', ageFilters[selectedAgeFilter], ageLeftHover, ageRightHover);
    drawFilterCircle(cx, cy2, 'Nationality', nationalityFilters[selectedNationalityFilter], natLeftHover, natRightHover);
    // --- end filter UI ---
    // 手部指示點
    if (poses.length > 0) {
      let pose = poses[0];
      let rightWrist = pose.keypoints.find(k => k.name === 'right_wrist');
      let leftWrist = pose.keypoints.find(k => k.name === 'left_wrist');
      if (rightWrist && rightWrist.confidence > 0.5) {
        smoothedRightWristX = lerp(smoothedRightWristX, rightWrist.x, SMOOTHING_FACTOR);
        smoothedRightWristY = lerp(smoothedRightWristY, rightWrist.y, SMOOTHING_FACTOR);
        push(); noStroke(); fill(255, 200); circle(smoothedRightWristX, smoothedRightWristY, 40); pop();
      }
      if (leftWrist && leftWrist.confidence > 0.5) {
        smoothedLeftWristX = lerp(smoothedLeftWristX, leftWrist.x, SMOOTHING_FACTOR);
        smoothedLeftWristY = lerp(smoothedLeftWristY, leftWrist.y, SMOOTHING_FACTOR);
        push(); noStroke(); fill(255, 160); circle(smoothedLeftWristX, smoothedLeftWristY, 40); pop();
      }
    }
  }
}

// 修改繪製骨架的函數
function drawPoseSet(poseSet, lineColor, pointColor1, pointColor2, pointColor3, pointColor4) {
  for (let pose of poseSet) {
    // 繪製骨架連接線
    for (let connection of connections) {
      let pointA = pose.keypoints[connection[0]];
      let pointB = pose.keypoints[connection[1]];
      if (pointA.confidence > 0.1 && pointB.confidence > 0.1) {
        stroke(lineColor);
        strokeWeight(15);
        // 翻轉 x 座標
        let flippedAX = width - pointA.x;
        let flippedBX = width - pointB.x;
        line(flippedAX, pointA.y, flippedBX, pointB.y);
      }
    }

    // 繪製關鍵點
    for (let keypoint of pose.keypoints) {
      if (keypoint.confidence > 0.1) {
        fill(pointColor1);
        noStroke();
        // 翻轉 x 座標
        let flippedX = width - keypoint.x;
        circle(flippedX, keypoint.y, 15);
      }
    }
  } 
}

// 檢查是否為 Y-pose
function isYPose(pose) {
  if (!pose || !pose.keypoints) {
    console.log("error: cannot get pose data");
    return false;
  }
  
  if (isYPoseLocked) {
    console.log("Y-pose detection is locked");
    return false;
  }

  // 輸出所有關鍵點信息
  // console.log("all keypoint information:");
  // pose.keypoints.forEach((keypoint, index) => {
  //   console.log(`index ${index}: ${keypoint.name} - position: (${keypoint.x.toFixed(1)}, ${keypoint.y.toFixed(1)}) - confidence: ${keypoint.confidence.toFixed(2)}`);
  // });
  
  // 獲取需要的關鍵點
  let leftShoulder = pose.keypoints[11];  // 左肩
  let rightShoulder = pose.keypoints[12]; // 右肩
  let leftElbow = pose.keypoints[13];     // 左肘
  let rightElbow = pose.keypoints[14];    // 右肘
  
  // 檢查關鍵點是否存在
  if (!leftShoulder || !rightShoulder || !leftElbow || !rightElbow) {
    console.log("error: missing necessary keypoints");
    return false;
  }
  
  // 檢查置信度
  // if (leftShoulder.confidence < 0.5) console.log("left shoulder confidence is not enough");
  // if (rightShoulder.confidence < 0.5) console.log("right shoulder confidence is not enough");
  // if (leftElbow.confidence < 0.5) console.log("left elbow confidence is not enough");
  // if (rightElbow.confidence < 0.5) console.log("right elbow confidence is not enough");
  
  if (leftShoulder.confidence < 0.5 || rightShoulder.confidence < 0.5 ||
      leftElbow.confidence < 0.5 || rightElbow.confidence < 0.5) {
    return false;
  }

  // 輸出關鍵點位置信息
  // console.log("\nkeypoint positions:");
  // console.log("left shoulder position:", leftShoulder.x.toFixed(1), leftShoulder.y.toFixed(1));
  // console.log("right shoulder position:", rightShoulder.x.toFixed(1), rightShoulder.y.toFixed(1));
  // console.log("left elbow position:", leftElbow.x.toFixed(1), leftElbow.y.toFixed(1));
  // console.log("right elbow position:", rightElbow.x.toFixed(1), rightElbow.y.toFixed(1));
  
  // 檢查手肘是否高於肩膀（y軸向上為正）
  let leftElbowAboveShoulder = leftElbow.y < leftShoulder.y;
  let rightElbowAboveShoulder = rightElbow.y < rightShoulder.y;
  
  // 計算手肘與肩膀的垂直距離
  let leftElbowHeight = leftElbow.y - leftShoulder.y;
  let rightElbowHeight = rightElbow.y - rightShoulder.y;
  
  // 輸出詳細信息
  // console.log("\npose analysis:");
  // console.log(`left shoulder y value: ${leftShoulder.y.toFixed(1)}`);
  // console.log(`left elbow y value: ${leftElbow.y.toFixed(1)}`);
  // console.log(`right shoulder y value: ${rightShoulder.y.toFixed(1)}`);
  // console.log(`right elbow y value: ${rightElbow.y.toFixed(1)}`);
  // console.log(`left elbow above shoulder: ${leftElbowAboveShoulder} (height difference: ${leftElbowHeight.toFixed(1)}px)`);
  // console.log(`right elbow above shoulder: ${rightElbowAboveShoulder} (height difference: ${rightElbowHeight.toFixed(1)}px)`);
  
  // // 檢查所有條件
  // if (!leftElbowAboveShoulder) console.log("left elbow is not above shoulder");
  // if (!rightElbowAboveShoulder) console.log("right elbow is not above shoulder");
  
  // 如果兩肘都高於肩膀，則認為是Y-pose
  let isYPose = leftElbowAboveShoulder && rightElbowAboveShoulder;
                
  if (isYPose) {
    console.log("\nY-pose detected!");
  } else {
    console.log("\nY-pose not detected");
  }
  
  return isYPose;
}

// 新增檢查全身骨架的函數
function isFullBodyDetected(pose) {
  if (!pose || !pose.keypoints) return false;
  
  // 定義需要檢查的關鍵點索引
  const requiredKeypoints = [
    0,  // nose
    11, // left shoulder
    12, // right shoulder
    23, // left hip
    24, // right hip
    25, // left knee
    26, // right knee
    27, // left ankle
    28  // right ankle
  ];
  
  // 檢查所有必要關鍵點是否存在且置信度足夠高
  for (let index of requiredKeypoints) {
    const keypoint = pose.keypoints[index];
    if (!keypoint || keypoint.confidence < 0.5) {
      return false;
    }
  }
  
  return true;
}

// Callback function for when bodyPose outputs data
function gotPoses(results) {
  poses = results;
  
  if (showingTitle) {
    if (poses.length > 0 && isFullBodyDetected(poses[0])) {
      showingTitle = false;
      showingIntro = true;
      startTime = millis();
    }
    return;
  }
  
  if (showingIntro) {
    if (millis() - startTime > INTRO_DURATION) {
      showingIntro = false;
      showingAge = true;
    }
    return;
  }
  
  if (showingAge && poses.length > 0) {
    let pose = poses[0];
    let rightHand = pose.keypoints.find(k => k.name === 'right_wrist');
    let leftHand = pose.keypoints.find(k => k.name === 'left_wrist');
    
    if (rightHand && leftHand && rightHand.confidence > 0.5 && leftHand.confidence > 0.5) {
      let circleRadius = 100;
      let circleSpacing = 30;
      let totalWidth = (circleRadius * 2 * 4) + (circleSpacing * 3);
      let startX = (width - totalWidth) / 2 + circleRadius;
      let startY = height/2;
      
      // 檢查手部位置是否在圓形選項範圍內
      for (let i = 0; i < ageGroups.length; i++) {
        let x, y;
        if (i < 4) {
          x = startX + i * (circleRadius * 2 + circleSpacing);
          y = startY - circleRadius - circleSpacing/2;
        } else {
          x = startX + (i - 4) * (circleRadius * 2 + circleSpacing);
          y = startY + circleRadius + circleSpacing/2;
        }
        
        // 計算手部到圓心的距離
        let rightHandDist = dist(rightHand.x, rightHand.y, x, y);
        let leftHandDist = dist(leftHand.x, leftHand.y, x, y);
        
        if (rightHandDist <= circleRadius || leftHandDist <= circleRadius) {
          if (selectedAge !== i) {
            selectedAge = i;
            isSelectingAge = true;
            ageSelectionStartTime = millis();
          }
          
          if (isSelectingAge && 
              millis() - ageSelectionStartTime > AGE_SELECTION_DURATION) {
            showingAge = false;
            showingNationality = true;
            startTime = millis();
          }
          break;
        } else if (selectedAge === i) {
          selectedAge = null;
          isSelectingAge = false;
        }
      }
    }
    return;
  }
  
  if (showingNationality && poses.length > 0) {
    let pose = poses[0];
    let rightHand = pose.keypoints.find(k => k.name === 'right_wrist');
    let leftHand = pose.keypoints.find(k => k.name === 'left_wrist');
    
    if (rightHand && leftHand && rightHand.confidence > 0.5 && leftHand.confidence > 0.5) {
      let circleRadius = 120;
      let circleSpacing = 50;
      let totalWidth = (circleRadius * 2 * 4) + (circleSpacing * 3);
      let startX = (width - totalWidth) / 2 + circleRadius;
      let startY = height/2;
      
      // 檢查手部位置是否在圓形選項範圍內
      for (let i = 0; i < nationalities.length; i++) {
        let x, y;
        if (i < 4) {
          x = startX + i * (circleRadius * 2 + circleSpacing);
          y = startY - circleRadius - circleSpacing/2;
        } else {
          x = startX + (i - 4) * (circleRadius * 2 + circleSpacing);
          y = startY + circleRadius + circleSpacing/2;
        }
        
        // 計算手部到圓心的距離
        let rightHandDist = dist(rightHand.x, rightHand.y, x, y);
        let leftHandDist = dist(leftHand.x, leftHand.y, x, y);
        
        if (rightHandDist <= circleRadius || leftHandDist <= circleRadius) {
          if (selectedNationality !== i) {
            selectedNationality = i;
            isSelectingNationality = true;
            nationalitySelectionStartTime = millis();
          }
          
          if (isSelectingNationality && 
              millis() - nationalitySelectionStartTime > NATIONALITY_SELECTION_DURATION) {
            showingNationality = false;
            waitingToStart = true;
            startTime = millis();
          }
          break;
        } else if (selectedNationality === i) {
          selectedNationality = null;
          isSelectingNationality = false;
        }
      }
    }
    return;
  }
  
  if (poses.length > 0) {
    // 檢查是否為 Y-pose
    if (isYPose(poses[0])) {
      if (!isHoldingYPose) {
        // 開始計時
        isHoldingYPose = true;
        yPoseStartTime = millis();
        console.log("Y pose detected!");
      } else if (millis() - yPoseStartTime > YPOSE_HOLD_DURATION) {
        // 如果保持 Y-pose 超過 2 秒，開始錄製
        startRecording();
        isYPoseLocked = true; // 鎖定 Y-pose 檢測
      }
    } else {
      // 如果不是 Y-pose，重置計時
      isHoldingYPose = false;
    }
  }
}

// 修改開始錄製的函數
function startRecording() {
  waitingToStart = false;
  isCountingDown = true;
  isHoldingYPose = false; // 重置 Y-pose 狀態
  startTime = millis();
  // 每次開始錄製時產生新的隨機色相
  currentHue = random(360);
}

// 新增下載函數
function downloadRecording() {
  // Get the current emotion index
  const emotionIndex = emotions.indexOf(currentEmotion);
  
  // Get or initialize the counter for this emotion
  const counterKey = `emotion_${emotionIndex}_counter`;
  let fileNumber = parseInt(localStorage.getItem(counterKey)) || 1;
  
  // Create the file number with leading zeros
  const paddedNumber = String(emotionIndex * 1000 + fileNumber).padStart(4, '0');
  const filename = `pose-recording-${paddedNumber}.json`;
  
  // Increment the counter for next time
  localStorage.setItem(counterKey, fileNumber + 1);
  
  // Create the data object to save
  let dataToSave = {
    timestamp: new Date().toISOString(),
    duration: RECORDING_DURATION,
    frameRate: 1000/RECORD_INTERVAL,
    emotion: currentEmotion,
    emotionIndex: emotionIndex,
    ageGroup: ageGroups[selectedAge],
    ageGroupIndex: selectedAge,
    nationality: nationalities[selectedNationality],
    nationalityIndex: selectedNationality,
    colors: {
      main: currentHue,
      secondary: (currentHue + 120) % 360,
      tertiary: (currentHue + 240) % 360,
      accent1: (currentHue + 30) % 360,
      accent2: (currentHue - 30) % 360
    },
    poses: recordedPoses
  };
  
  // Convert to JSON string
  let jsonString = JSON.stringify(dataToSave, null, 2);
  
  // Create Blob
  let blob = new Blob([jsonString], { type: 'application/json' });
  
  // Create download link
  let url = URL.createObjectURL(blob);
  let link = document.createElement('a');
  link.download = filename;
  link.href = url;
  link.click();
  
  // Clean up URL object
  URL.revokeObjectURL(url);
}

// 修改重置函數
function resetAll() {
  // 重置所有顯示階段
  showingTitle = true;
  showingIntro = false;
  showingPrompt = false;
  showingAge = false;
  showingNationality = false;
  waitingToStart = false;
  isCountingDown = false;
  isDetecting = false;
  isReplaying = false;
  isShowingResult = false;
  
  // 重置 Y-pose 相關狀態
  isHoldingYPose = false;
  isYPoseLocked = false;
  yPoseStartTime = 0;
  
  // 重置選擇相關狀態
  selectedAge = null;
  isSelectingAge = false;
  ageSelectionStartTime = 0;
  selectedNationality = null;
  isSelectingNationality = false;
  nationalitySelectionStartTime = 0;
  
  // 重置過濾器狀態
  selectedAgeFilter = 0; // "All" 選項
  selectedNationalityFilter = 0; // "All" 選項
  
  // 重置時間相關變數
  startTime = millis();
  lastRecordTime = 0;
  replayStartTime = 0;
  
  // 重置文字相關變數
  textOpacity = 0;
  promptY = 0;
  
  // 清空姿勢資料
  poses = [];
  recordedPoses = [];
  
  // 重置背景動畫
  backgroundPoints = new ConnectionPoints(25);
  
  // 重置情緒動畫
  currentEmotion = emotions[Math.floor(Math.random() * emotions.length)];
  
  // 重置骨架動畫
  skeletonAnimations = [];
  setTimeout(() => {
    initSkeletonAnimations();
  }, 1000);
  
  // 停止並重新啟動骨架偵測
  bodyPoseDetector.detectStop();
  setTimeout(() => {
    bodyPoseDetector.detectStart(videoStream, gotPoses);
  }, 100);
  
  // 隱藏按鈕
  resetButton.hide();
  downloadButton.hide();
}

// 修改 mousePressed 函數
function mousePressed() {
  // 處理骨架動畫的滑鼠點擊
  if (!isReplaying && !showingTitle && !showingIntro && !showingAge && !showingNationality && !waitingToStart && !isCountingDown && !isDetecting) {
    handleSkeletonMousePressed();
  }
}

// 修改開始重播的函數
function startReplay() {
  isReplaying = true;
  replayStartTime = millis();
  //resetButton.show();
  //downloadButton.show();
}