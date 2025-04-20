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
let showingPrompt = true;
let isCountingDown = false;
const PROMPT_DURATION = 5000; // 提示文字顯示5秒
const COUNTDOWN_DURATION = 3000; // 倒數3秒
const RECORDING_DURATION = 5000; // 錄製5秒
let isReplaying = false;
let replayStartTime = 0;

// 新增字體變數
let myFont;
let myFontBold;

// 新增 reset 按鈕變數
let resetButton;

// 新增等待開始錄製的狀態
let waitingToStart = false;
let startButton;

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

// 新增 T-pose 檢測相關變數
let isWaitingForTPose = false;
let tPoseDetected = false;
let tPoseStartTime = 0;
const TPOSE_HOLD_DURATION = 2000; // 需要保持 T-pose 2秒

function preload() {
  // Load the bodyPose model
  bodyPoseDetector = ml5.bodyPose('BlazePose', { flipped: true });
  // fonts
  myFont = loadFont('/assets/font/Favorit-Inter.otf');
  myFontBold = loadFont('/assets/font/Favorit-Bold.otf');
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
    
    // 添加攝影機就緒事件監聽
    videoStream.on('loadedmetadata', function() {
      console.log('Camera is ready');
    });
    
    // 添加攝影機錯誤事件監聽
    videoStream.on('error', function(err) {
      console.error('Camera error:', err);
      // 顯示錯誤訊息
      textAlign(CENTER, CENTER);
      textSize(24);
      fill(255);
      text('Camera error. Please check your camera settings.', width/2, height/2);
    });
    
  } catch (error) {
    console.error('Failed to create video capture:', error);
    // 顯示錯誤訊息
    textAlign(CENTER, CENTER);
    textSize(24);
    fill(255);
    text('Failed to access camera. Please check your browser settings.', width/2, height/2);
  }

  // 創建 reset 按鈕（一開始隱藏）
  resetButton = createButton('RESET');
  resetButton.position(width/2 - 50, height - 60);
  resetButton.size(100, 40);
  resetButton.style('font-size', '16px');
  resetButton.style('background-color', '#ffffff');
  resetButton.style('border', 'none');
  resetButton.style('border-radius', '20px');
  resetButton.style('cursor', 'pointer');
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
  downloadButton.mousePressed(downloadRecording);
  downloadButton.hide();

  connections = bodyPoseDetector.getConnections();
  
  // 設定開始時間
  startTime = millis();
}

function draw() {
  background(0);
  
  // 顯示提示文字階段
  if (showingPrompt) {
    textAlign(CENTER, CENTER);
    fill(255);
    
    // 計算文字位置
    let y = height/2;
    
    // "How do you express" 使用 Inter
    textFont(myFont);
    textSize(32);
    text('How do you express', width/2, y - 40);
    
    // 當前選擇的情緒 使用 Medium
    textFont(myFontBold);
    textSize(32);
    text(`"${currentEmotion}"`, width/2, y);
    
    // "with your body?" 使用 Inter
    textFont(myFont);
    textSize(32);
    text('with your body?', width/2, y + 40);
    
    if (millis() - startTime > PROMPT_DURATION) {
      showingPrompt = false;
      waitingToStart = true;
      isWaitingForTPose = true; // 開始等待 T-pose
      startTime = millis();
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
    pop();

    // 顯示 T-pose 提示
    textAlign(CENTER, CENTER);
    fill(255);
    textFont(myFont);
    textSize(32);
    text('Please stand in a T-pose to start recording', width/2, height - 100);

    // 檢查 T-pose
    if (poses.length > 0) {
      if (isTPose(poses[0])) {
        if (!tPoseDetected) {
          tPoseDetected = true;
          tPoseStartTime = millis();
        }
        
        // 顯示 T-pose 已檢測到的訊息
        textFont(myFontBold);
        textSize(48);
        fill(0, 255, 0); // 綠色文字
        text('T-pose detected!', width/2, height - 150);
        
        // 顯示保持時間
        let holdTime = millis() - tPoseStartTime;
        let holdProgress = min(holdTime / TPOSE_HOLD_DURATION, 1);
        textSize(24);
        text(`Hold for ${ceil((TPOSE_HOLD_DURATION - holdTime) / 1000)} seconds`, width/2, height - 200);
        
        // 繪製進度條
        noFill();
        stroke(255);
        strokeWeight(2);
        rect(width/2 - 100, height - 180, 200, 10);
        fill(0, 255, 0);
        noStroke();
        rect(width/2 - 100, height - 180, 200 * holdProgress, 10);
        
        if (millis() - tPoseStartTime > TPOSE_HOLD_DURATION) {
          startRecording();
        }
      } else {
        tPoseDetected = false;
      }
    }
    return;
  }

  // 倒數計時階段
  if (isCountingDown) {
    // 水平翻轉攝影機畫面
    push();
    translate(width, 0);
    scale(-1, 1);
    image(videoStream, 0, 0, width, height);
    pop();
    
    let timeLeft = ceil((COUNTDOWN_DURATION - (millis() - startTime)) / 1000);
    textSize(128);
    textAlign(CENTER, CENTER);
    fill(255);
    text(timeLeft, width/2, height/2);

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
    pop();
    
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
    textSize(32);
    textAlign(RIGHT, TOP);
    fill(255);
    text(recordingTimeLeft, width - 20, 20);

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
    
    
    // 顯示 reset 和 download 按鈕
    resetButton.show();
    downloadButton.show();
    
    let replayTime = millis() - replayStartTime;
    let frameIndex = Math.floor((replayTime / RECORDING_DURATION) * recordedPoses.length);
    
    // 重播結束時重新開始
    if (frameIndex >= recordedPoses.length) {
      replayStartTime = millis();
      frameIndex = 0;
    }
    
    // 使用時間戳記來更精確地重播
    let currentPose = recordedPoses[frameIndex];
    if (currentPose) {
      drawPoseSet(
        [{ keypoints: currentPose.keypoints }],
        color(currentHue, 80, 90, 255),
        color((currentHue + 120) % 360, 80, 90, 255),
        color((currentHue + 240) % 360, 80, 90, 255),
        color((currentHue + 30) % 360, 80, 90, 255),
        color((currentHue - 30) % 360, 80, 90, 255)
      );
    }
    pop();
    
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

// Callback function for when bodyPose outputs data
function gotPoses(results) {
  // Save the output to the poses variable
  poses = results;
}

// 新增 T-pose 檢測函數
function isTPose(pose) {
  if (!pose || !pose.keypoints) return false;

  // 獲取關鍵點
  const leftShoulder = pose.keypoints[11];
  const rightShoulder = pose.keypoints[12];
  const leftElbow = pose.keypoints[13];
  const rightElbow = pose.keypoints[14];
  const leftWrist = pose.keypoints[15];
  const rightWrist = pose.keypoints[16];
  const leftHip = pose.keypoints[23];
  const rightHip = pose.keypoints[24];

  // 檢查關鍵點的可信度
  if (!leftShoulder || !rightShoulder || !leftElbow || !rightElbow || 
      !leftWrist || !rightWrist || !leftHip || !rightHip) {
    return false;
  }

  // 檢查可信度閾值
  const confidenceThreshold = 0.5;
  if (leftShoulder.confidence < confidenceThreshold || 
      rightShoulder.confidence < confidenceThreshold ||
      leftElbow.confidence < confidenceThreshold ||
      rightElbow.confidence < confidenceThreshold ||
      leftWrist.confidence < confidenceThreshold ||
      rightWrist.confidence < confidenceThreshold ||
      leftHip.confidence < confidenceThreshold ||
      rightHip.confidence < confidenceThreshold) {
    return false;
  }

  // 計算角度
  const leftArmAngle = calculateAngle(leftShoulder, leftElbow, leftWrist);
  const rightArmAngle = calculateAngle(rightShoulder, rightElbow, rightWrist);
  const shoulderAngle = calculateAngle(leftShoulder, rightShoulder, rightHip);

  // T-pose 條件：
  // 1. 手臂與身體成90度（允許±15度的誤差）
  // 2. 肩膀與髖部平行
  const angleThreshold = 15;
  return Math.abs(leftArmAngle - 90) < angleThreshold &&
         Math.abs(rightArmAngle - 90) < angleThreshold &&
         Math.abs(shoulderAngle - 180) < angleThreshold;
}

// 新增角度計算函數
function calculateAngle(a, b, c) {
  const ab = { x: b.x - a.x, y: b.y - a.y };
  const cb = { x: b.x - c.x, y: b.y - c.y };
  
  const dot = (ab.x * cb.x + ab.y * cb.y);
  const cross = (ab.x * cb.y - ab.y * cb.x);
  
  const angle = Math.atan2(cross, dot) * (180 / Math.PI);
  return Math.abs(angle);
}

// 修改開始錄製的函數
function startRecording() {
  waitingToStart = false;
  isWaitingForTPose = false;
  tPoseDetected = false;
  isCountingDown = true;
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
  showingPrompt = true;
  waitingToStart = false;
  isCountingDown = false;
  isDetecting = false;
  isReplaying = false;
  poses = [];
  recordedPoses = [];
  startTime = millis();
  
  // 隨機選擇新的情緒
  currentEmotion = random(emotions);
  
  resetButton.hide();
  downloadButton.hide();
}

