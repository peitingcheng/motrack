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
let isReplaying = false;
let replayStartTime = 0;

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

// 新增背景動畫變數
let backgroundPoints;

// 新增 result display 變數
let resultDisplay;

// 新增國籍選擇相關變數
let showingNationality = false;
let nationalities = [
  "Asia",
  "Africa",
  "North America",
  "South America",
  "Europe",
  "Australia"
];
let selectedNationality = null;
let nationalitySelectionStartTime = 0;
const NATIONALITY_SELECTION_DURATION = 2000; // 需要保持選擇2秒
let isSelectingNationality = false;

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
  // 設定使用 HSB 顏色模式
  colorMode(HSB, 360, 100, 100, 255);
  // 產生隨機色相
  currentHue = random(360);

  // 隨機選擇一個情緒
  currentEmotion = random(emotions);

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
    text('Use your body to express ideas,\nemotions, and see how movement\nbecomes its own kind of language.', 100, y+140);
    
    if (millis() - startTime > INTRO_DURATION) {
      showingIntro = false;
      showingNationality = true;
      startTime = millis();
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
    push();  // 保存當前繪圖狀態
    textAlign(CENTER, CENTER);
    textFont(myFont);
    textSize(72);
    noStroke();  // 確保標題沒有外框
    fill(255);
    text('Select your nationality', width/2, 200);
    pop();  // 恢復之前的繪圖狀態
    
    // 計算圓形選項的位置
    let circleRadius = 120;
    let circleSpacing = 50;
    let totalWidth = (circleRadius * 2 * 3) + (circleSpacing * 2);
    let startX = (width - totalWidth) / 2 + circleRadius;
    let startY = height/2;
    
    // 第一排三個選項
    for (let i = 0; i < 3; i++) {
      let x = startX + i * (circleRadius * 2 + circleSpacing);
      let y = startY - circleRadius - circleSpacing/2;
      let isSelected = selectedNationality === i;
      
      // 繪製圓形背景
      noStroke();
      if (isSelected) {
        fill(255, 100);  // 選中時完全不透明
      } else {
        fill(255, 70);   // 未選中時較高透明度
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
    
    // 第二排三個選項
    for (let i = 3; i < 6; i++) {
      let x = startX + (i - 3) * (circleRadius * 2 + circleSpacing);
      let y = startY + circleRadius + circleSpacing/2;
      let isSelected = selectedNationality === i;
      
      // 繪製圓形背景
      noStroke();
      if (isSelected) {
        fill(255, 100);  // 選中時完全不透明
      } else {
        fill(255, 70);   // 未選中時較高透明度
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
      text('When you\'re ready\nmake a Y-pose to start recording', width/2, height - 200);
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
      resultDisplay.startReplay();
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
    resultDisplay.draw(videoStream, recordedPoses, currentHue, drawPoseSet);
    return;
  } else {
    // 確保在非重播階段隱藏按鈕
    resetButton.hide();
    downloadButton.hide();
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
        strokeWeight(5);
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
        circle(flippedX, keypoint.y, 10);
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
      showingNationality = true;
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
      let totalWidth = (circleRadius * 2 * 3) + (circleSpacing * 2);
      let startX = (width - totalWidth) / 2 + circleRadius;
      let startY = height/2;
      
      // 檢查手部位置是否在圓形選項範圍內
      for (let i = 0; i < nationalities.length; i++) {
        let x, y;
        if (i < 3) {
          x = startX + i * (circleRadius * 2 + circleSpacing);
          y = startY - circleRadius - circleSpacing/2;
        } else {
          x = startX + (i - 3) * (circleRadius * 2 + circleSpacing);
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
  showingTitle = true;
  showingIntro = false;
  showingPrompt = false;
  showingNationality = false;
  waitingToStart = false;
  isCountingDown = false;
  isDetecting = false;
  isReplaying = false;
  isHoldingYPose = false;
  isYPoseLocked = false;
  selectedNationality = null;
  isSelectingNationality = false;
  poses = [];
  recordedPoses = [];
  startTime = millis();
  
  // 重置背景動畫
  backgroundPoints = new ConnectionPoints(25);
  
  // 重置情緒動畫
  currentEmotion = random(emotions);
  
  // 停止骨架偵測
  bodyPoseDetector.detectStop();
  
  resetButton.hide();
  downloadButton.hide();
}